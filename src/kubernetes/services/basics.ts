import * as pulumi from '@pulumi/pulumi';

export interface Ingress {
  // if ingress should be enabled or not
  // defaults to true
  enabled?: pulumi.Input<boolean>;
  // the ingress host i.e. www.example.com
  host: pulumi.Input<string>;
  // enable acme tls ('kubernetes.io/tls-acme') for this ingress
  // defaults to true
  tls?: pulumi.Input<boolean>;
  // the ingress class for this ingress
  // defaults to 'nginx'
  class?: pulumi.Input<string>;
  // any additional annotations for the ingress resource
  annotations?: pulumi.Input<Record<string, string>>;
}

export interface Persistence {
  // if ingress should be enabled or not
  // defaults to true
  enabled?: pulumi.Input<boolean>;
  // the size of the persistent volume in Gigabytes
  // non-interger values are supported
  // note that some cloud providers have a minimum
  // volume size that is used if your choice is too small
  sizeGB: number;
  // the storage class for the persistent volume
  // defaults to undefined (i.e. use the cluster's default storage class)
  storageClass?: string;
}

// see kubernetes official documentation for
// resource request/limit value format
export interface ComputeResources {
  requests: {
    cpu: string,
    memory: string,
  },
  limits: {
    cpu: string,
    memory: string,
  },
}
