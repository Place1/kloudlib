import { betterExec, BetterExec } from "./exec";

interface PodLabelSelector {
  name: string;
}

export async function spawnLogForward(selector: PodLabelSelector): Promise<Array<BetterExec>> {
  const pods = JSON.parse(await betterExec().run(`kubectl get pods --selector='name=${selector.name}' -o json`));
  return pods.items.map((pod: any) => {
    return betterExec()
      .pipeDefault()
      .start(`kubectl logs -n ${pod.metadata.namespace} -f ${pod.metadata.name}`);
  });
}
