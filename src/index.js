import { promises as fs } from 'fs';
import path from 'path';
import axios from 'axios';
import url from 'url';
import cheerio from 'cheerio';

const normalizeName = (name) => {
  const st = new RegExp('[a-zA-Z0-9]');
  return name.split('').map((e) => (!st.test(e) ? '-' : e)).join('');
};

const getPage = (request, responceHandler) => axios.get(request)
  .then(responceHandler)
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
    requestBuilder: (urlPath) => urlPath,
    responseHandler: (filepath) => (response) => fs.writeFile(filepath, response.data, 'utf-8'),
  }, {
    name: 'img',
    attribute: 'src',
    requestBuilder: (urlPath) => ({
      method: 'get',
      url: urlPath,
      responseType: 'stream',
    }),
    responseHandler: (filepath) => (response) => response.data.pipe(fs.createWriteStream(filepath)),
  }, {
    name: 'script',
    attribute: 'src',
    requestBuilder: (urlPath) => urlPath,
    responseHandler: (filepath) => (response) => fs.writeFile(filepath, response.data, 'utf-8'),
  },
];

const dataHandling = (data, directory) => {
  const $ = cheerio.load(data);
  const promises = [];
  tags.forEach((tag) => {
    $(tag.name).each((i, element) => {
      const att = $(element).attr(tag.attribute);
      if (att && url.parse(att).protocol === null) {
        const filepath = path.parse(att);
        const newBaseName = normalizeName(`${filepath.dir}/${filepath.name}`).slice(1);
        const newfilePath = `${directory}/${newBaseName}${filepath.ext}`;

        promises.push(getPage(tag.requestBuilder(att),
          tag.responseHandler(path.resolve(newfilePath))));

        $(element).attr(tag.attribute, newfilePath);
      }
    });
  });
  return { data: $.html(), promises };
};

const pageloader = (address, directory) => getPage(address, (response) => response.data)
  .then((data) => {
    const page = url.parse(address);
    const baseName = normalizeName(`${page.host}${page.path}`);
    const pathToFile = path.resolve(directory, `${baseName}.html`);
    const newData = dataHandling(data, `${baseName}_files`); // _files
    return writePage(newData.data, pathToFile)
      .then(fs.mkdir(path.resolve(directory, `${baseName}_files`)))
      .then(Promise.all(newData.promises));
  });

export default pageloader;
