#!/bin/bash

kubectl get services -o json | jq -r '.items[].metadata.name' | while read service; do
  port=$(kubectl get service $service -o json | jq -c '.spec.ports[0].port')
  kubectl port-forward service/$service $port:$port &
done
