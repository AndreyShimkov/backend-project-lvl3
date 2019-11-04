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

const createHandler = (filepath) => (data) => writeData(filepath, data);

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

const tags = {
  link: 'href',
  img: 'src',
  script: 'src',
};

const linkBuilder = (pageName, oldLinkAddress) => {
  const link = path.parse(oldLinkAddress.pathname);
  const newFileName = normalizeName(`${link.dir.slice(1)}/${link.name}`);
  return `${pageName}_files/${newFileName}${link.ext}`;
};

const dataHandler = (page, baseName, targetDir, data) => {
  const $ = cheerio.load(data);
  const links = [];

  Object.keys(tags).forEach((tag) => {
    $(tag).each((i, el) => {
      const attribute = $(el).attr(tags[tag]);
      const link = new URL(attribute, page.origin);
      if (attribute && link.hostname === page.hostname) {
        const newfilePath = linkBuilder(baseName, link);

        links.push({ addressLink: link.href, fileLink: path.resolve(targetDir, newfilePath) });

        $(el).attr(tags[tag], newfilePath);
      }
    });
  });

  return [$.html(), links];
};

const linkHandler = (links) => {
  const tasks = links.map(({ addressLink, fileLink }) => ({
    title: `Downloading file from ${addressLink}`,
    task: () => getElement(addressLink, createHandler(fileLink)),
  }));
  const listR = new Listr(tasks, { concurrent: true });
  return listR.run();
};

const pageloader = (address, targetDirectory) => fs.readdir(targetDirectory)
  .catch((e) => {
    debug(`ERROR: Тarget directory does not exist. ${e.message}`);
    throw (e);
  })
  .then(() => getElement(address, (content) => content))
  .then((data) => {
    const pageAddress = new URL(address);
    const baseName = normalizeName(`${pageAddress.host}${pageAddress.pathname}`);
    const [html, links] = dataHandler(pageAddress, baseName, targetDirectory, data);

    return fs.mkdir(path.resolve(targetDirectory, `${baseName}_files`))
      .catch((e) => {
        debug(`ERROR: Can't create folder '*_files'. ${e.message}`);
        throw (e);
      })
      .then(() => linkHandler(links))
      .then(() => writeData(path.resolve(targetDirectory, `${baseName}.html`), html));
  });

export default pageloader;
