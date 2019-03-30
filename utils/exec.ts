import childProcess, { ChildProcess } from 'child_process';

const defaults =
    {
      cwd: process.cwd(),
    }

export function exec(command: string, options = defaults) {
  return new Promise<{ stdout: string, stderr: string }>((resolve, reject) => {
    childProcess.exec(command, { ...options }, (err, stdout, stderr) => {
      if (err) {
        return reject(err);
      }
      return resolve({ stdout, stderr });
    });
  });
}

export class BetterExec {

  private stdout?: NodeJS.WritableStream;
  private stderr?: NodeJS.WritableStream;
  private process?: ChildProcess;
  private result?: Promise<string>;
  private wasKilled = false;

  pipeDefault(): this {
    this.stdout = process.stdout;
    this.stderr = process.stderr;
    return this;
  }

  pipeStdout(stream: NodeJS.WritableStream): this {
    this.stdout = stream;
    return this;
  }

  pipeStderr(stream: NodeJS.WritableStream): this {
    this.stderr = stream;
    return this;
  }

  start(cmd: string): this {
    this.result = new Promise<string>((resolve, reject) => {
      this.process = childProcess.exec(cmd, (err, stdout, stderr) => {
        if (this.wasKilled) {
          return resolve();
        }
        if (err) {
          return reject(new Error(stderr));
        }
        return resolve(stdout);
      });

      if (this.stdout) {
        this.process.stdout!.pipe(this.stdout);
      }

      if (this.stderr) {
        this.process.stderr!.pipe(this.stderr);
      }
    });
    return this;
  }

  run(cmd: string): Promise<string> {
    this.start(cmd);
    return this.out();
  }

  out() {
    if (this.result) {
      return this.result;
    }
    throw new Error('call run() first');
  }

  kill() {
    if (this.process) {
      this.wasKilled = true;
      this.process.kill();
    }
  }
}

export function betterExec() {
  return new BetterExec();
}
