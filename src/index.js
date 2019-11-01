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

const writeData = (filepath, data) => fs.writeFile(filepath, data)
  .catch((e) => {
    debug(`ERROR: Can't write file ${filepath}. ${e.message}`);
    throw (e);
  });

const rHandler = (pathToFile) => (fileData) => writeData(pathToFile, fileData);

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
  const links = [];

  tags.forEach((tag) => {
    $(tag.name).each((i, el) => {
      const att = $(el).attr(tag.attribute);
      const linkAddress = new URL(att, page.origin);
      if (att && linkAddress.hostname === page.hostname) {
        const newfilePath = linkConstructor(baseName, linkAddress);

        links.push({ oldLink: linkAddress.href, newLink: path.resolve(targetDir, newfilePath) });

        $(el).attr(tag.attribute, newfilePath);
      }
    });
  });

  return [$.html(), links];
};

const linkHandler = (links) => {
  const tasks = links.map(({ oldLink, newLink }) => ({
    title: `Downloading file from ${oldLink}`,
    task: () => getElement(oldLink, rHandler(newLink)),
  }));
  const listR = new Listr(tasks, { concurrent: true });
  return listR.run();
};

const pageloader = (address, targetDirectory) => fs.readdir(targetDirectory)
  .then(() => getElement(address, (html) => html))
  .then((data) => {
    const pageAddress = new URL(address);
    const baseName = normalizeName(`${pageAddress.host}${pageAddress.pathname}`);
    const [html, links] = dataHandler(pageAddress, baseName, targetDirectory, data);

    return fs.mkdir(path.resolve(targetDirectory, `${baseName}_files`))
      .then(() => linkHandler(links))
      .catch((e) => {
        debug(`ERROR: Can't create folder '*_files'. ${e.message}`);
        throw (e);
      })
      .then(() => writeData(path.resolve(targetDirectory, `${baseName}.html`), html))
      .catch((e) => {
        debug(`ERROR: Can't create file '${baseName}.html'. ${e.message}`);
        throw (e);
      });
  })
  .catch((e) => {
    debug(`ERROR: Тarget directory does not exist. ${e.message}`);
    throw (e);
  });

export default pageloader;
