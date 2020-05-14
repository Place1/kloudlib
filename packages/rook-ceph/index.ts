/**
 * @module "@kloudlib/rook-ceph"
 * @packageDocumentation
 * @example
 * ```typescript
 * import { RookCeph } from '@kloudlib/rook-ceph';
 *
 * new RookCeph('rook-ceph', {
 *   // ...
 * });
 * ```
 */

import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as abstractions from '@kloudlib/abstractions';

export interface RookCephInputs {
  provider?: k8s.Provider;
  namespace?: pulumi.Input<string>;
  /**
   * the helm chart version
   */
  version?: string;
  /**
   * Enable Rook Ceph Toolbox Deployment
   * Defaults to true.
   */
  toolbox?: boolean;
  /**
   * Enable a Ceph Cluster
   * Enabled by default.
   */
  cluster?: CephCluster;
  /**
   *
   */
  blockPool?: CephBlockPool;
  /**
   * Configure a default storage class.
   * Enabled by default.
   */
  storageClass?: CephStorageClass;
}

export interface CephCluster {
  /**
   * Enable the cluster.
   * Defaults to true.
   */
  enabled?: boolean;
  /**
   * Set the ceph docker image.
   */
  cephVersion?: string;
  /**
   * Configure the ceph mons
   */
  mons?: {
    /**
     * The number of mons to run.
     */
    count?: number;
  };
  storage?: {
    /**
     * Use all cluster nodes for running OSDs.
     * Defaults to false.
     */
    useAllNodes?: boolean;
    /**
     * Use all attached storage devices.
     * Rook will only select a device that has no
     * partitions or logical filesystem.
     * Defaults to false.
     */
    useAllDevices?: boolean;
    /**
     * A list of device paths to create bluestores in.
     * E.g. /dev/sdb
     * Defaults to an empty list.
     */
    devices?: string[];
    /**
     * A list of directories to create filestores in.
     * E.g. /rook/storage-dir
     * Defaults to an empty list.
     */
    directories?: string[];
    /**
     * Node specific configuration.
     * If non-empty then 'useAllNodes' must not be true.
     * Defaults to an empty list.
     */
    nodes?: CephNodeOSDConfig[];
  };
  dashboard?: {
    /**
     * Enable the ceph dashboard.
     * Defaults to true
     */
    enabled?: boolean;
    /**
     * Enable ingress to the dashboard.
     */
    ingress?: abstractions.Ingress;
  };
}

export interface CephNodeOSDConfig {
  /**
   * The name of the kubernetes node.
   * Required.
   */
  name: string;
  /**
   * A list of devices that should be used to
   * run OSDs on this node.
   * Defaults to an empty list.
   */
  devices?: string[];
  /**
   * A list of directories that should be used to
   * run OSDs on this node.
   * Defaults to an empty list.
   */
  directories?: string[];
}

export interface CephBlockPool {
  /**
   * Enable the block pool.
   * Defaults to true.
   */
  enabled?: boolean;
  /**
   * Set the pool name.
   * Defaults to '${resource-name}-replicapool'
   */
  name?: string;
  /**
   * Set the pool's Failure Domain.
   * Defaults to 'host'.
   */
  failureDomain?: string;
  /**
   * Set the data replication size.
   * Defaults to 1.
   */
  replicas?: number;
}

export interface CephStorageClass {
  /**
   * Enable the storage class.
   * Defaults to true.
   */
  enabled?: boolean;
  /**
   * Set a name for the storage class.
   * Defaults to '${resource-name}'.
   */
  name?: string;
  /**
   * Sets the storage class reclaim policy.
   * Defaults to 'Delete'.
   */
  reclaimPolicy?: string;
  /**
   * Set the file system type for the storage class.
   * Defaults to 'xfs'.
   */
  fstype?: 'xfs' | 'ext4';
  /**
   * Enable volume expansion.
   * Defaults to true.
   */
  allowVolumeExpansion?: boolean;
}

export interface RookCephOutputs {}

/**
 * @noInheritDoc
 */
export class RookCeph extends pulumi.ComponentResource implements RookCephOutputs {
  readonly meta: pulumi.Output<abstractions.HelmMeta>;

  constructor(name: string, props?: RookCephInputs, opts?: pulumi.CustomResourceOptions) {
    super('kloudlib:RookCeph', name, props, opts);

    this.meta = pulumi.output<abstractions.HelmMeta>({
      chart: 'rook-ceph',
      version: props?.version ?? '1.2.2',
      repo: 'https://charts.rook.io/release',
    });

    const rook = this.createRookOperator(name, props);

    if (props?.toolbox ?? true) {
      this.createToolbox(name, props, rook);
    }

    if (props?.cluster?.enabled ?? true) {
      const cluster = this.createDefaultCluster(name, props, rook);

      if (props?.blockPool?.enabled ?? true) {
        const pool = this.createDefaultBlockPool(name, props, cluster);

        if (props?.storageClass?.enabled ?? true) {
          this.createDefaultStorageClass(name, props, cluster, pool);
        }
      }
    }
  }

  private createRookOperator(name: string, props?: RookCephInputs) {
    return new k8s.helm.v3.Chart(
      name,
      {
        namespace: props?.namespace,
        chart: this.meta.chart,
        version: this.meta.version,
        fetchOpts: {
          repo: this.meta.repo,
        },
        values: {
          logLevel: 'ERROR',
        },
      },
      {
        parent: this,
        providers: props?.provider
          ? {
              kubernetes: props?.provider,
            }
          : {},
      }
    );
  }

  private createToolbox(name: string, props: RookCephInputs | undefined, rook: k8s.helm.v3.Chart) {
    const toolboxName = `${name}-toolbox`;
    return new k8s.apps.v1.Deployment(
      `${name}-rook-toolbox`,
      {
        metadata: {
          name: toolboxName,
          namespace: props?.namespace,
          annotations: {
            'pulumi.com/skipAwait': 'true',
          },
        },
        spec: {
          selector: {
            matchLabels: {
              app: toolboxName,
            },
          },
          template: {
            metadata: {
              labels: {
                app: toolboxName,
              },
            },
            spec: {
              containers: [
                {
                  name: 'toolbox',
                  image: 'rook/ceph:v1.2.1',
                  command: ['/tini'],
                  args: ['-g', '--', '/usr/local/bin/toolbox.sh'],
                  env: [
                    {
                      name: 'ROOK_ADMIN_SECRET',
                      valueFrom: {
                        secretKeyRef: {
                          name: 'rook-ceph-mon',
                          key: 'admin-secret',
                        },
                      },
                    },
                  ],
                  securityContext: { privileged: true },
                  volumeMounts: [
                    {
                      mountPath: '/dev',
                      name: 'dev',
                    },
                    {
                      mountPath: '/sys/bus',
                      name: 'sysbus',
                    },
                    {
                      mountPath: '/lib/modules',
                      name: 'libmodules',
                    },
                    {
                      mountPath: '/etc/rook',
                      name: 'mon-endpoint-volume',
                    },
                  ],
                },
              ],
              hostNetwork: true,
              volumes: [
                {
                  name: 'dev',
                  hostPath: {
                    path: '/dev',
                  },
                },
                {
                  name: 'sysbus',
                  hostPath: {
                    path: '/sys/bus',
                  },
                },
                {
                  name: 'libmodules',
                  hostPath: {
                    path: '/lib/modules',
                  },
                },
                {
                  name: 'mon-endpoint-volume',
                  configMap: {
                    name: 'rook-ceph-mon-endpoints',
                    items: [
                      {
                        key: 'data',
                        path: 'mon-endpoints',
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      },
      {
        parent: this,
        provider: props?.provider,
        dependsOn: rook,
      }
    );
  }

  private createDefaultCluster(name: string, props: RookCephInputs | undefined, rook: k8s.helm.v3.Chart) {
    return new k8s.apiextensions.CustomResource(
      `${name}-ceph-cluster`,
      {
        apiVersion: 'ceph.rook.io/v1',
        kind: 'CephCluster',
        metadata: {
          name: `${name}-ceph-cluster`,
          namespace: props?.namespace,
        },
        spec: {
          cephVersion: {
            image: 'ceph/ceph:v14.2.6',
          },
          dataDirHostPath: '/var/lib/rook',
          mon: {
            count: props?.cluster?.mons?.count ?? 1,
          },
          storage: {
            useAllNodes: props?.cluster?.storage?.useAllNodes ?? false,
            useAllDevices: props?.cluster?.storage?.useAllDevices ?? false,
            directories: props?.cluster?.storage?.directories?.map((path) => ({ path })),
            devices: props?.cluster?.storage?.devices?.map((name) => ({ name })),
            nodes: props?.cluster?.storage?.nodes?.map((node) => ({
              name: node.name,
              directories: node.directories?.map((path) => ({ path })),
              devices: node.devices?.map((name) => ({ name })),
            })),
          },
          mgr: {
            modules: [
              {
                name: 'pg_autoscaler',
                enabled: true,
              },
            ],
          },
          dashboard: {
            enabled: props?.cluster?.dashboard?.enabled ?? true,
            port: 8443,
            ssl: false,
          },
          monitoring: {
            enabled: true,
          },
        },
      },
      {
        parent: this,
        provider: props?.provider,
        dependsOn: rook,
      }
    );
  }

  private createDefaultBlockPool(
    name: string,
    props: RookCephInputs | undefined,
    cluster: k8s.apiextensions.CustomResource
  ) {
    return new k8s.apiextensions.CustomResource(
      `${name}-storage-pool`,
      {
        apiVersion: 'ceph.rook.io/v1',
        kind: 'CephBlockPool',
        metadata: {
          name: props?.blockPool?.name ?? `${name}-replicapool`,
          namespace: props?.namespace,
        },
        spec: {
          failureDomain: props?.blockPool?.failureDomain ?? 'host',
          replicated: {
            size: props?.blockPool?.replicas ?? 1,
          },
        },
      },
      {
        parent: this,
        provider: props?.provider,
        dependsOn: cluster,
      }
    );
  }

  private createDefaultStorageClass(
    name: string,
    props: RookCephInputs | undefined,
    cluster: k8s.apiextensions.CustomResource,
    pool: k8s.apiextensions.CustomResource
  ) {
    return cluster.metadata.namespace.apply((namespace) => {
      namespace = namespace || 'default';
      return new k8s.storage.v1.StorageClass(
        `${name}-storage-class`,
        {
          metadata: {
            name: props?.storageClass?.name ?? name,
            annotations: {
              'storageclass.kubernetes.io/is-default-class': 'true',
            },
          },
          provisioner: `${namespace}.rbd.csi.ceph.com`,
          reclaimPolicy: props?.storageClass?.reclaimPolicy ?? 'Delete',
          parameters: {
            clusterID: namespace,
            pool: pool.metadata.name,
            imageFormat: '2',
            imageFeatures: 'layering',
            'csi.storage.k8s.io/provisioner-secret-name': 'rook-csi-rbd-provisioner',
            'csi.storage.k8s.io/provisioner-secret-namespace': namespace,
            'csi.storage.k8s.io/node-stage-secret-name': 'rook-csi-rbd-node',
            'csi.storage.k8s.io/node-stage-secret-namespace': namespace,
            'csi.storage.k8s.io/fstype': props?.storageClass?.fstype ?? 'xfs',
          },
        },
        {
          parent: this,
          provider: props?.provider,
        }
      );
    });
  }
}
