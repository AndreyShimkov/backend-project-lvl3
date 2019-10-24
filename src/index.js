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

const dataWrite = (filepath, ...args) => fs.writeFile(filepath, ...args)
  .catch((e) => {
    debug(`ERROR: Can't write file ${filepath}. ${e.message}`);
    throw (e);
  });

const fileWrite = (filepath) => (response) => dataWrite(filepath, response.data, 'utf-8');

const fileWriteImg = (filepath) => (response) => fs.writeFile(filepath, response.data);

const getElement = (request, requestHandler) => axios(request)
  .then((response) => {
    debug(`SUCCESS: Get file from ${request.url}. Response status: ${response.status}`);
    return requestHandler(response);
  })
  .catch((e) => {
    debug(`ERROR: Can't get file from ${request.url}. ${e.message}`);
    throw (e);
  });

const tags = [
  {
    name: 'link',
    attribute: 'href',
    request: (address) => ({
      method: 'get',
      url: address,
    }),
    responseHandler: fileWrite,
  }, {
    name: 'img',
    attribute: 'src',
    request: (address) => ({
      method: 'get',
      url: address,
      responseType: 'arraybuffer',
    }),
    responseHandler: fileWriteImg,
  }, {
    name: 'script',
    attribute: 'src',
    downloader: getElement,
    request: (address) => ({
      method: 'get',
      url: address,
    }),
    responseHandler: fileWrite,
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

        const promise = ({
          title: `Downloading ${tag.name} file from ${linkAddress.href}`,
          task: () => getElement(tag.request(linkAddress.href),
            tag.responseHandler(path.resolve(targetDir, newfilePath)))
            .catch((e) => { throw (e); }),
        });

        promises.push(promise);

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
  .then(() => getElement({ method: 'get', url: address }, (response) => response.data))
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
