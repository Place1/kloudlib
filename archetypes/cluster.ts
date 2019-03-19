import * as gcp from "@pulumi/gcp";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";
import { codeBlock } from "common-tags";

export enum NodeMachineTypes {
	G1Small = 'g1-small',
	N1Standard1 = 'n1-standard-1',
}

export interface ClusterOptions {
	initialNodeCount?: number;
	nodeMachineType?: NodeMachineTypes;
	noMonitoring?: boolean;
	noIngress?: boolean;
}

export class Cluster extends pulumi.ComponentResource {

	private cluster: gcp.container.Cluster;
	private name: string;

	constructor(name: string, options: ClusterOptions = {}) {
		super("example:cluster", name);
		this.name = name;

		const password = new random.RandomString("password", { length: 32 });
		this.cluster = new gcp.container.Cluster(name, {
			initialNodeCount: options.initialNodeCount || 3,
			nodeVersion: "latest",
			minMasterVersion: "latest",
			masterAuth: {
				username: 'admin',
				password: password.result,
			},
			nodeConfig: {
				machineType: options.nodeMachineType || NodeMachineTypes.G1Small,
				oauthScopes: [
					"https://www.googleapis.com/auth/compute",
					"https://www.googleapis.com/auth/devstorage.read_only",
					"https://www.googleapis.com/auth/logging.write",
					"https://www.googleapis.com/auth/monitoring"
				],
			},
		});

		if (!options.noIngress) {
			// deploy ingress controller
		}

		if (!options.noMonitoring) {
			// deploy:
			// - prometheus
			// - loki
			// - grafana
		}
	}

	getKubernetesProvider() {
		return new k8s.Provider(`kubernetes-provider-${this.name}`, {
			kubeconfig: this.getKubeConfig(),
		});
	}

	getKubeConfig() {
		return pulumi
			.all([ this.cluster.name, this.cluster.endpoint, this.cluster.masterAuth ])
			.apply(([ name, endpoint, auth ]) => {
				const context = `${gcp.config.project}_${gcp.config.zone}_${name}`;
				return codeBlock`
					apiVersion: v1
					clusters:
					- cluster:
						certificate-authority-data: ${auth.clusterCaCertificate}
						server: https://${endpoint}
					name: ${context}
					contexts:
					- context:
						cluster: ${context}
						user: ${context}
					name: ${context}
					current-context: ${context}
					kind: Config
					preferences: {}
					users:
					- name: ${context}
					user:
						auth-provider:
						config:
							cmd-args: config config-helper --format=json
							cmd-path: gcloud
							expiry-key: '{.credential.token_expiry}'
							token-key: '{.credential.access_token}'
						name: gcp
					`;
			});
	}
}
