import * as pulumi from '@pulumi/pulumi';

export interface HelmMeta {
  chart: string;
  version: string;
  repo: string;
}

export interface Ingress {
  /**
   * If ingress should be enabled or not.
   * Defaults to true if "host" is set.
   */
  enabled?: pulumi.Input<boolean>;
  /**
   * The ingress host i.e. www.example.com.
   */
  hosts?: pulumi.Input<string[]>;
  /**
   * Enable acme tls ('kubernetes.io/tls-acme') for this ingress.
   * Defaults to true.
   */
  tls?: pulumi.Input<boolean>;
  /**
   * The ingress class for this ingress.
   * Defaults to 'nginx'.
   */
  class?: pulumi.Input<string>;
  /**
   * Any additional annotations for the ingress resource.
   */
  annotations?: pulumi.Input<Record<string, pulumi.Input<string>>>;
}

export interface Persistence {
  /**
   * if persistence should be enabled or not
   */
  enabled?: pulumi.Input<boolean>;
  /**
   * the size of the persistent volume in Gigabytes
   * non-interger values are supported
   * note that some cloud providers have a minimum
   * volume size that is used if your choice is too small
   */
  sizeGB?: number;
  /**
   * the storage class for the persistent volume
   * defaults to undefined (i.e. use the cluster's default storage class)
   */
  storageClass?: string;
  /**
   * the path within the pod to mount the volume
   * this value is typically ignored for many helm
   * based deployments which require a fixed path.
   */
  mountPath?: string;
}

/**
 * see kubernetes official documentation for
 * resource request/limit value format
 */
export interface ComputeResources {
  requests?: {
    cpu?: string;
    memory?: string;
  };
  limits?: {
    cpu?: string;
    memory?: string;
  };
}

export interface SimpleHealthProbe {
  /**
   * url is the HTTP url that will be used by
   * kubernetes to check the readiness of the container.
   * a 2xx status code indicates the container is ready
   * to receive traffic
   */
  path: string;
  /**
   * port configures the HTTP port that the health check
   * will connect to
   */
  port?: number;
}
