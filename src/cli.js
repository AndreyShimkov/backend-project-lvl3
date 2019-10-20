import commander from 'commander';
import pageloader from '.';

import { version } from '../package.json';

commander
  .version(version)
  .description('Downloads the web page to the specified address.')
  .option('-o, --output [directory name]', 'output directory', '.')
  .arguments('<address>')
  .action((address) => {
    pageloader(address, commander.output)
      .catch(console.error);
  });

export default commander;
