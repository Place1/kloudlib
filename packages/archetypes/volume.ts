import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';


export interface VolumeInterface {
  /**
   * k8s provider.
   * defaults to undefined (i.e. use the default k8s provider)
   */
  provider?: k8s.Provider;

  /**
   * pvc name
   */
  name?: string;
  /**
   * the namespace that contains the pvc
   */
  readonly namespace?: pulumi.Output<string>;

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
   * AccessModes contains the desired access modes the volume should have. More info:
   * https://kubernetes.io/docs/concepts/storage/persistent-volumes#access-modes-1
   */
  accessModes?: pulumi.Input<string>[];
  /**
   * labels for volume claim
   */
  labels?: pulumi.Input<{
    [key: string]: pulumi.Input<string>;
  }>;
}
