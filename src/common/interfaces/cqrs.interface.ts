export interface CQRSService {
  execute(...args: any[]): any;
}
