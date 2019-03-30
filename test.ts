import path from 'path';
import { buildImage } from "./archetypes/docker-image";
import Dockerode from 'dockerode';
import fs from 'fs';
import { getMinikubeDockerEnv } from './archetypes/minikube';

async function main() {
  const connection = await getMinikubeDockerEnv();
  const client = new Dockerode({
    host: '192.168.99.102',
    port: 2376,
    ca: fs.readFileSync('/home/james/.minikube/certs/ca.pem'),
    cert: fs.readFileSync('/home/james/.minikube/certs/cert.pem'),
    key: fs.readFileSync('/home/james/.minikube/certs/key.pem'),
  });

  const image = await buildImage(client, `my-app:${Date.now()}`, {
    context: path.join(__dirname, 'app'),
  });

  // console.log(image)

  // await client.getImage('example:123').remove();
}

main().catch((error) => console.error(error));
