import commander from 'commander';
import pageloader from '.';

import { version } from '../package.json';

commander
  .version(version)
  .description('Downloads the web page to the specified address.')
  .option('-o, --output [directory name]', 'output directory', process.cwd())
  .arguments('<address>')
  .action((address) => {
    pageloader(address, commander.output)
      .catch((e) => {
        console.error(e.message);
        process.exit(1);
      });
  });

export default commander;
