import * as cloud from '../src/kubernetes';

const provider = cloud.KUBECONFIG();

export const core = new cloud.Core('core', { provider });

export const app = new cloud.App('my-app', {
  provider: provider,
  imageName: '',
  src: './app',
  httpPort: 8000,
});
