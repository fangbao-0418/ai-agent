
interface AppStateDataProps {
  'node-dir': string;
  'download-dir': string;
}

class AppState {
  data: AppStateDataProps = {
    'node-dir': '',
    'download-dir': '',
  };
  constructor() {
  }
  
  get(key: keyof AppStateDataProps) {
    if (key === 'download-dir') {
      return this.data['node-dir'] + '/download3';
    }
    return this.data[key];
  }
  set(key: keyof AppStateDataProps, value: any) {
    this.data[key] = value;
  }
}
export default new AppState();