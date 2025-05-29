class AppState {
  data: any = {};
  constructor() {
  }
  get(key: string) {
    return this.data[key];
  }
  set(key: string, value: any) {
    this.data[key] = value;
  }
}
export default new AppState();