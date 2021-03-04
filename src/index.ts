/*======================================================
                     IMPORTS / SET UP
======================================================*/
import { each } from 'lodash';
import fs from 'fs';
import path from 'path';

import BuildGenerator from './lib/builder-generator';

import RequestOrchestrator, {
  OrchestratorConfig,
} from './lib/request-orchestrator';

type Config = {
  includeTypes?: 'typescript' | 'flow',
  requests: OrchestratorConfig,
  outputDir: string,
  fileExtension?: '.js' | '.ts',
  outputTransform?: (
    text: string,
    fileName: string
  ) => Promise<string> | string,
};

/*======================================================
                    MAIN DEFINITION
======================================================*/
async function main(config: Config) {
  if (config.requests) {
    const orchestrator = new RequestOrchestrator(config.requests);
    await orchestrator.run();

    const generator = new BuildGenerator(orchestrator._state, config);

    const builders = await generator.getBuilders();
    const outDir = path.join(process.cwd(), config.outputDir);

    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

    each(builders, async (val, key) => {
      let out = '';
      let exportLine = 'export {\n';

      if (val.__types) {
        out += val.__types;
      }

      each(val, (builder, nextKey) => {
        if (nextKey === '__types') return;
        out += builder.builderDef + '\n\n';
        exportLine += `  ${builder.builderName},\n`;
      });

      exportLine += '}';
      out += exportLine;
      const fileName = key + (config.fileExtension || '.js');

      if (config.outputTransform) {
        out = await config.outputTransform(out, fileName);
      }

      fs.writeFileSync(path.join(outDir, fileName), out);
    });
  }
}

export { main };
