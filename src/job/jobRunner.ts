import { logger } from '../utils';
import { SparkJob, SparkServer, LogEvent } from '../models';
import spark from "../spark";
import * as _ from 'lodash';
import getPort from 'get-port';
import Docker from 'dockerode';

class JobRunner {
    job: SparkJob;
    availableHosts: SparkServer[];

    constructor(job: SparkJob) {
        this.job = job;
    }

    kickOff = async () => {
        logger.info('Initializing job')
        this.init();
        logger.info(`Deploying ${this.job.name} to servers tagged with ${this.job.tags.join(', ')}`);
        await this.deployJob();
    }

    init = () => {
        const hosts = [spark.sparkServer, ...spark.sparkServer.siblings];
        this.availableHosts = hosts.filter(host => {
            let match = true;
            for (let i = 0; i < this.job.tags.length; i++) {
                if (_.find(host.tags, this.job.tags[i])) {
                    match = false; 
                    break;  
                }
            }
            return match;
        });
        spark.logMaster.addLog(LogEvent.RunJob, `${this.job.name} kick off`);
        logger.info(`${this.availableHosts.length} host found with tag(s) ${this.job.tags.join(', ')}`);
    }

    deployJob = async () => {

        const exposedPort = (this.job.exposedPort === 'auto') ? await getPort() : this.job.exposedPort;

        logger.info(`Exposing port ${exposedPort}`);

        const docker = new Docker({
            host: '127.0.0.1',
            port: 2375,
        });

        logger.info(`Pulling ${this.job.image} from dockerhub`);

        await docker.pull(this.job.image, (err: Error, stream: NodeJS.ReadableStream) => {
            stream.pipe(process.stdout)
        });

        logger.info(`Download successful`);

        spark.logMaster.addLog(LogEvent.ImagePulled, `${this.job.image} downloaded for job ${this.job.name}`);

        const { image, name, port, env } = this.job;

        const envConverted = Object.keys(env).map(envKey =>
            `${envKey}=${env[envKey]}`
        );

        const portMap = `${port}/tcp`;

        const exposed: any = {};
        exposed[portMap] = {};

        const bindings: any = {}
        bindings[portMap] = [{
            HostPort: exposedPort.toString()
        }];

        const options = {
            Image: image,
            ExposedPorts: exposed,
            Env: envConverted,
            name,
            HostConfig: {
                PortBindings: bindings
            }
        }

        try {
            await docker.createContainer(options, (err: Error, result) => {
                if (err) logger.error('An error occured while deploying the job', err);
                result!.start((startErr: Error, startRes: any) => {
                    if (startErr) logger.error('An error occured while deploying the job', startErr);
                    console.log(startRes);
                })
            });
            logger.info(`${this.job.name} successfully started on ${spark.sparkServer.hostName}`)

            spark.logMaster.addLog(LogEvent.JobStarted, `${this.job.image} started for job ${this.job.name}`);
        } catch (e) {
            logger.error('Error starting docker container', e);
        }

    }

}

export default JobRunner;
