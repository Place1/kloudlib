import { betterExec, exec, BetterExec } from "./utils/exec";
import { spawnPortForward } from "./utils/port-forward";
import { Debounce } from 'lodash-decorators';
import chokidar from 'chokidar';
import { spawnLogForward } from "./utils/log-forward";

class Application {

  private portForwardingProcesses?: Array<BetterExec>;
  private logForwardingProcesses?: Array<BetterExec>;

  // todo: make sure this method is cancelled and run again
  // with a reasonable debounce
  private async up() {
    this.stopPortForwarding();
    this.stopLogForwarding();
    await betterExec().pipeDefault().run('pulumi up --yes');
    this.startLogForwarding();
    this.startPortForwarding();
  }

  private async down() {
    this.stopPortForwarding();
    await betterExec().pipeDefault().run('pulumi destroy --yes');
    this.stopLogForwarding();
  }

  async run() {
    this.up();
    await this.connectSignals();
  }

  private async startPortForwarding() {
    this.stopPortForwarding(); // just in case
    const outputs = JSON.parse(await betterExec().run('pulumi stack output app --json'));
    this.portForwardingProcesses = outputs.service.spec.ports.map((port: any) => {
      return spawnPortForward(outputs.service.metadata.name, port.targetPort, port.port);
    });
  }

  private stopPortForwarding() {
    if (this.portForwardingProcesses) {
      this.portForwardingProcesses.forEach((p) => p.kill());
      this.portForwardingProcesses = undefined;
    }
  }

  private async startLogForwarding() {
    const outputs = JSON.parse(await betterExec().run(`pulumi stack output app --json`));
    const label = outputs.deployment.spec.selector.matchLabels.name;
    this.logForwardingProcesses = await spawnLogForward({ name: label });
  }

  private stopLogForwarding() {
    if (this.logForwardingProcesses) {
      this.logForwardingProcesses.forEach((p) => p.kill());
      this.logForwardingProcesses = undefined;
    }
  }

  private connectSignals() {
    this.handleFileChanges();
    return this.handleKillSignal();
  }

  private handleFileChanges() {
    chokidar
      .watch(process.cwd(), {ignored: /\.pulumi/ })
      .on('change', (path) => {
        console.info(`change detected: ${path}. Reloading...`);
        this.up();
      });
  }

  private handleKillSignal() {
    return new Promise((resolve) => {
      let caughtSignal = false;
      process.on('SIGINT', async () => {
        if (!caughtSignal) {
          console.log('Ctrl+C detected. Shutting down...');
          caughtSignal = true;
          await this.down();
          process.exit(0);
        } else {
          console.log('Ok you really want to kill this bitch, exiting without stopping the infrastructure.');
          process.exit(1);
        }
        resolve();
      });
    });
  }
}

async function main() {
  await new Application().run();
}

main().catch(err => console.error(err));
