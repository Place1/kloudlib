import * as k8s from '@pulumi/kubernetes';

export class Minikube {
  static getProvider() {
    return new k8s.Provider('minikube', {
      context: 'minikube',
    });
  }
}
