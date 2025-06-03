interface AppStateDataProps {
  'node-dir': string;
  'download-dir': string;
  'session-id': string;
  'temp-download-dir': string;
}

class AppState {
  data: AppStateDataProps = {
    'node-dir': '',
    'download-dir': '',
    'session-id': '',
    'temp-download-dir': '',
  };
  constructor() {
  }
  
  get(key: keyof AppStateDataProps): string {
    if (key === 'download-dir') {
      return this.data['node-dir'] + '/download';
    } else if (key === 'temp-download-dir') {
      return this.get('download-dir') + '/' + (this.get('session-id') ?? '');
    }
    return this.data[key];
  }
  
  set(key: keyof AppStateDataProps, value: any) {
    this.data[key] = value;
  }
}
export default new AppState();