import path from "path";

interface AppStateDataProps {
  'node-dir': string;
  'download-dir': string;
  'session-id': string;
  'temp-download-dir': string;
  'temp-page-dir': string;
  'log-dir': string;
  'download-number': any,
  socket?: any
}

const defaultData: AppStateDataProps = {
  'socket': null,
  'node-dir': '',
  'download-dir': '',
  'temp-page-dir': '',
  'session-id': '',
  'temp-download-dir': '',
  'log-dir': '',
  'download-number': 0,
}

class AppState {
  data: AppStateDataProps = defaultData;
  constructor() {
    console.log(this.data, "constructor")
  }

  get <K extends keyof AppStateDataProps>(key: K): AppStateDataProps[K] {
    if (key === 'download-dir') {
      return path.join(this.get('node-dir'), 'download');
    } else if (key === 'node-dir') {
      return path.join((this.data['node-dir'] || process.cwd()), 'file');
    } else if (key === 'temp-download-dir') {
      return path.join(this.get('download-dir'), (this.get('session-id') ?? ''));
      // return path.join(this.get('download-dir'));
    } else if (key === 'temp-page-dir') {
      return path.join(this.get('node-dir'), 'temp-page');
    } else if (key === 'log-dir') {
      return path.join(this.get('node-dir'), 'logs');
    }
    return this.data[key];
  }
  
  set(key: keyof AppStateDataProps, value: any) {
    this.data[key] = value;
  }
}
export default new AppState();