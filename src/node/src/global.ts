interface AppStateDataProps {
  'node-dir': string;
  'download-dir': string;
  'session-id': string;
  'temp-download-dir': string;
  socket?: any
}

class AppState {
  data: AppStateDataProps = {
    'socket': null,
    'node-dir': process.cwd() + '/file',
    'download-dir': '',
    'session-id': '',
    'temp-download-dir': '',
  };
  constructor() {
  }

  get <K extends keyof AppStateDataProps>(key: K): AppStateDataProps[K] {
    if (key === 'download-dir') {
      return this.get('node-dir') + '/download';
    } else if (key === 'node-dir') {
      return this.data['node-dir'] || process.cwd() + '/file';
    } else if (key === 'temp-download-dir') {
      return this.get('download-dir') 
      // + '/' + (this.get('session-id') ?? '');
    }
    return this.data[key];
  }
  
  set(key: keyof AppStateDataProps, value: any) {
    this.data[key] = value;
  }
}
export default new AppState();