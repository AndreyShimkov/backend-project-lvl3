import { promises as fs, createWriteStream as writeStream } from 'fs';
import path from 'path';
import axios from 'axios';
import url from 'url';
import cheerio from 'cheerio';

const normalizeName = (name) => {
  const st = new RegExp('[a-zA-Z0-9]');
  return name.split('').map((e) => (!st.test(e) ? '-' : e)).join('');
};

const getElement = (request, filepath) => axios.get(request)
  .then((response) => fs.writeFile(filepath, response.data, 'utf-8'))
  .catch((e) => console.log(e));

const getPicture = (request, filepath) => axios({
  method: 'get',
  url: request,
  responseType: 'stream',
})
  .then((response) => response.data.pipe(writeStream(filepath)))
  .catch((e) => console.log(e));

const writePage = (data, pathToFile) => fs.writeFile(pathToFile, data, 'utf-8')
  .then(console.log('Done!'));

const tags = [
  {
    name: 'link',
    attribute: 'href',
    downloader: getElement,
  }, {
    name: 'img',
    attribute: 'src',
    downloader: getPicture,
  }, {
    name: 'script',
    attribute: 'src',
    downloader: getElement,
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

        const promise = tag.downloader(`${page.protocol}//${page.host}${att}`,
          path.resolve(directory, newfilePath));

        promises.push(promise);


        $(element).attr(tag.attribute, newfilePath);
      }
    });
  });
  const pathToFile = path.resolve(directory, `${base}.html`);
  promises.push(writePage($.html(), pathToFile));
  return promises;
};

const pageloader = (address, directory) => axios.get(address)
  .then((response) => {
    const page = url.parse(address);

    const baseName = normalizeName(`${page.host}${page.path}`);

    const promises = dataHandling(response.data, baseName, directory, address);

    return fs.mkdir(path.resolve(directory, `${baseName}_files`))
      .then(Promise.all(promises));
  });

export default pageloader;
