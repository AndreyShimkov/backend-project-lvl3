import { promises as fs, createWriteStream as writeStream } from 'fs';
import path from 'path';
import axios from 'axios';
import url from 'url';
import cheerio from 'cheerio';

const normalizeName = (name) => {
  const st = new RegExp('[a-zA-Z0-9]');
  return name.split('').map((e) => (!st.test(e) ? '-' : e)).join('');
};

const getPage = (request, responseHandler) => axios.get(request)
  .then(responseHandler)
  .catch((error) => {
    if (error.response) {
      console.log(`Error response ${error.response.status}`);
      throw error.response.status;
    }
    throw error;
  });

const getPicture = (request, responseHandler) => axios(request)
  .then(responseHandler)
  .catch((error) => {
    if (error.response) {
      console.log(`Error response ${error.response.status}`);
      throw error.response.status;
    }
    throw error;
  });

const writePage = (data, pathToFile) => fs.writeFile(pathToFile, data, 'utf-8')
  .then(console.log('Done!'));

// link = href, img = src, script = src

const tags = [
  {
    name: 'link',
    attribute: 'href',
    requestBuilder: (address) => address,
    responseHandler: (filepath) => (response) => fs.writeFile(filepath, response.data, 'utf-8'),
    fn: getPage,
  }, {
    name: 'img',
    attribute: 'src',
    requestBuilder: (address) => ({
      method: 'get',
      url: address,
      responseType: 'stream',
    }),
    responseHandler: (filepath) => (response) => response.data.pipe(writeStream(filepath)),
    fn: getPicture,
  }, {
    name: 'script',
    attribute: 'src',
    requestBuilder: (address) => address,
    responseHandler: (filepath) => (response) => fs.writeFile(filepath, response.data, 'utf-8'),
    fn: getPage,
  },
];

const dataHandling = (data, base, directory, address) => {
  const $ = cheerio.load(data);
  const promises = [];
  const page = url.parse(address);

  tags.forEach((tag) => {
    $(tag.name).each((i, element) => {
      const att = $(element).attr(tag.attribute);
      if (att && url.parse(att).protocol === null) {
        const linkPath = path.parse(att);
        const newBaseName = normalizeName(`${linkPath.dir}/${linkPath.name}`).slice(1);
        const newfilePath = `${base}_files/${newBaseName}${linkPath.ext}`;

        const promise = tag.fn(tag.requestBuilder(`${page.protocol}//${page.host}${att}`),
          tag.responseHandler(path.resolve(directory, newfilePath)));

        promises.push(promise);


        $(element).attr(tag.attribute, newfilePath);
      }
    });
  });
  const pathToFile = path.resolve(directory, `${base}.html`);
  promises.push(writePage($.html(), pathToFile));
  return promises;
};

const pageloader = (address, directory) => getPage(address, (response) => response.data)
  .then((data) => {
    const page = url.parse(address);

    const baseName = normalizeName(`${page.host}${page.path}`);

    const promises = dataHandling(data, baseName, directory, address);

    return fs.mkdir(path.resolve(directory, `${baseName}_files`))
      .then(Promise.all(promises));
  });

export default pageloader;
