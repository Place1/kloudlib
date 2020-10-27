export function removeHelmHooks() {
  return (obj: any) => {
    if (!obj) {
      return;
    }
    if (obj.metadata && obj.metadata.annotations && obj.metadata.annotations['helm.sh/hook']) {
      // transforms in nodejs expects you to mutate input object, not return a new one.
      // https://github.com/pulumi/pulumi-kubernetes/blob/4b01b5114df3045cecefd2ff3e2f2ed64430e3dd/sdk/nodejs/yaml/yaml.ts#L2214
      for (const key in obj) {
        delete obj[key];
      }
      Object.assign(obj, {
        // using a ConfigMapList because of this:
        // https://github.com/pulumi/pulumi-kubernetes/issues/1156
        kind: 'ConfigMapList',
        apiVersion: 'v1',
        metadata: {},
        items: [],
      });
      return null;
    }
    return;
  };
}

export function removeHelmTests() {
  return removeHelmHooks();
}

export function replaceApiVersion(kind: string, from: string, to: string) {
  return (obj: any) => {
    if (!obj) {
      return;
    }
    if (obj.kind === kind && obj.apiVersion === from) {
      obj.apiVersion = to;
      return;
    }
    return;
  };
}
