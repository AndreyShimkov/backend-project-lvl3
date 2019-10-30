import { promises as fs } from 'fs';
import path from 'path';
import axios from 'axios';
import cheerio from 'cheerio';
import Debug from 'debug';
import Listr from 'listr';

const debug = Debug('page-loader');

const normalizeName = (name) => {
  const st = new RegExp('[a-zA-Z0-9]');
  return name.split('').map((e) => (!st.test(e) ? '-' : e)).join('');
};

const dataWrite = (filepath, data) => fs.writeFile(filepath, data)
  .catch((e) => {
    debug(`ERROR: Can't write file ${filepath}. ${e.message}`);
    throw (e);
  });

const rHandler = (PathToFile) => (fileData) => dataWrite(PathToFile, fileData);

const getElement = (addr, responseHandler) => axios({
  method: 'get',
  url: addr,
  responseType: 'arraybuffer',
})
  .then((response) => {
    debug(`SUCCESS: Get file from ${addr}. Response status: ${response.status}`);
    return responseHandler(response.data);
  })
  .catch((e) => {
    debug(`ERROR: Can't get file from ${addr}. ${e.message}`);
    throw (e);
  });

const tags = [
  {
    name: 'link',
    attribute: 'href',
  }, {
    name: 'img',
    attribute: 'src',
  }, {
    name: 'script',
    attribute: 'src',
  },
];

const linkConstructor = (pageName, oldLinkAddress) => {
  const link = path.parse(oldLinkAddress.pathname);
  const newFileName = normalizeName(`${link.dir.slice(1)}/${link.name}`);
  return `${pageName}_files/${newFileName}${link.ext}`;
};

const dataHandler = (page, baseName, targetDir, data) => {
  const $ = cheerio.load(data);
  const promises = [];

  tags.forEach((tag) => {
    $(tag.name).each((i, el) => {
      const att = $(el).attr(tag.attribute);
      const linkAddress = new URL(att, page.origin);
      if (att && linkAddress.hostname === page.hostname) {
        const newfilePath = linkConstructor(baseName, linkAddress);

        promises.push({
          title: `Downloading ${tag.name} file from ${linkAddress.href}`,
          task: () => getElement(linkAddress.href,
            rHandler(path.resolve(targetDir, newfilePath)))
            .catch((e) => { throw (e); }),
        });

        $(el).attr(tag.attribute, newfilePath);
      }
    });
  });
  const tasks = new Listr(promises, { concurrent: true });

  return dataWrite(path.resolve(targetDir, `${baseName}.html`), $.html(), 'utf-8')
    .then(() => tasks.run())
    .catch((e) => {
      debug(`ERROR: Can't create file '${baseName}.html'. ${e.message}`);
      throw (e);
    });
};

const pageloader = (address, targetDirectory) => fs.readdir(targetDirectory)
  .then(() => getElement(address, (html) => html))
  .then((data) => {
    const pageAddress = new URL(address);
    const baseName = normalizeName(`${pageAddress.host}${pageAddress.pathname}`);

    return fs.mkdir(path.resolve(targetDirectory, `${baseName}_files`))
      .then(() => dataHandler(pageAddress, baseName, targetDirectory, data))
      .catch((e) => {
        debug(`ERROR: Can't create folder '*_files'. ${e.message}`);
        throw (e);
      });
  })
  .catch((e) => {
    debug(`ERROR: Тarget directory does not exist. ${e.message}`);
    throw (e);
  });

export default pageloader;
