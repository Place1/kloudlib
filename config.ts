import { Config } from "@pulumi/pulumi";

const config = new Config();

// nodeCount is the number of cluster nodes to provision. Defaults to 3 if unspecified.
export const nodeCount = config.getNumber("nodeCount") || 3;

// nodeMachineType is the machine type to use for cluster nodes. Defaults to g1-small if unspecified.
// See https://cloud.google.com/compute/docs/machine-types for more details on available machine types.
export const nodeMachineType = config.get("nodeMachineType") || "g1-small";
