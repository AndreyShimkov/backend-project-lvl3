import { promises as fs, createWriteStream as writeStream } from 'fs';
import path from 'path';
import axios from 'axios';
import cheerio from 'cheerio';
import Debug from 'debug';

const debug = Debug('page-loader');

const normalizeName = (name) => {
  const st = new RegExp('[a-zA-Z0-9]');
  return name.split('').map((e) => (!st.test(e) ? '-' : e)).join('');
};

const dataWrite = (filepath, data) => fs.writeFile(filepath, data, 'utf-8')
  .catch((e) => {
    debug(`ERROR: Can't write file ${filepath}. ${e.message}`);
    throw (e);
  });

const fileWrite = (filepath) => (response) => dataWrite(filepath, response.data);

// unknow catch =(
const fileWriteStream = (filepath) => (response) => response.data.pipe(writeStream(filepath));

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
      responseType: 'stream',
    }),
    responseHandler: fileWriteStream,
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

        const promise = getElement(tag.request(linkAddress.href),
          tag.responseHandler(path.resolve(targetDir, newfilePath)));

        promises.push(promise
          .then(() => ({ result: 'success' }))
          .catch((e) => ({ result: 'error', error: e })));

        $(el).attr(tag.attribute, newfilePath);
      }
    });
  });

  const pathToFile = path.resolve(targetDir, `${baseName}.html`);

  const writePage = dataWrite(pathToFile, $.html())
    .then(() => ({ result: 'success' }))
    .catch((e) => ({ result: 'error', error: e }));

  promises.push(writePage);

  return Promise.all(promises);
};

const pageloader = (address, targetDirectory) => fs.readdir(targetDirectory)
  .then(() => getElement({ method: 'get', url: address }, (response) => response.data))
  .then((data) => {
    const pageAddress = new URL(address);
    const baseName = normalizeName(`${pageAddress.host}${pageAddress.pathname}`);

    return fs.mkdir(path.resolve(targetDirectory, `${baseName}_files`))
      .then(() => dataHandler(pageAddress, baseName, targetDirectory, data))
      .catch((e) => {
        debug(`ERROR: Can't create folder '_files'. ${e.message}`);
        throw (e);
      });
  })
  .then((results) => results.forEach((v) => {
    if (v.error) {
      throw (v.error);
    }
  }))
  .catch((e) => {
    debug(`ERROR: Тarget directory does not exist. ${e.message}`);
    throw (e);
  });

export default pageloader;
