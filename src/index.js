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
  .then((response) => fs.writeFile(filepath, response.data, 'utf-8'));

const getPicture = (request, filepath) => axios({
  method: 'get',
  url: request,
  responseType: 'stream',
})
  .then((response) => response.data.pipe(writeStream(filepath)));

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

const pageloader = (address, targetDirectory) => axios.get(address)
  .then((response) => {
    const page = url.parse(address);
    const baseName = normalizeName(`${page.host}${page.path}`);
    const $ = cheerio.load(response.data);
    const promises = [];

    tags.forEach((tag) => {
      $(tag.name).each((i, element) => {
        const att = $(element).attr(tag.attribute);
        if (att && url.parse(att).protocol === null) {
          const linkPath = path.parse(att);
          const newBaseName = normalizeName(`${linkPath.dir}/${linkPath.name}`).slice(1);
          const newfilePath = `${baseName}_files/${newBaseName}${linkPath.ext}`;

          const promise = tag.downloader(`${page.protocol}//${page.host}${att}`,
            path.resolve(targetDirectory, newfilePath));

          promises.push(promise);

          $(element).attr(tag.attribute, newfilePath);
        }
      });
    });

    const pathToFile = path.resolve(targetDirectory, `${baseName}.html`);

    promises.push(fs.writeFile(pathToFile, $.html(), 'utf-8'));

    return fs.mkdir(path.resolve(targetDirectory, `${baseName}_files`))
      .then(Promise.all(promises));
  })
  .catch((e) => { throw (e.message); });

export default pageloader;
