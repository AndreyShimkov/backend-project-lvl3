import { promises as fs } from 'fs';
import path from 'path';
import axios from 'axios';
import cheerio from 'cheerio';
import { request } from 'http';

const normalizeName = (name) => {
  const st = new RegExp('[a-zA-Z0-9]');
  const pageName = name.slice(name.indexOf('//') + 2);
  return pageName.split('').map((e) => (!st.test(e) ? '-' : e)).join('');
};

const elements = ['script', 'link'];

const linkHandling = (link, dir) => {
  if (link.indexOf('http') >= 0) {
    return link;
  }
  return axios.get(path.resolve('http://', link))
    .then(console.log(request.path))
    .then(link.replace(link, dir));
};
/*
// GET request for remote image
axios({
  method: 'get',
  url: 'http://bit.ly/2mTM3nY',
  responseType: 'stream'
})
  .then(function (response) {
    response.data.pipe(fs.createWriteStream('ada_lovelace.jpg'))
  });
*/
const changeAttribute = [
  {
    checkType: (type, cheer) => type === 'img' && cheer('img').attr('src'),
    builder: (tags, dirName) => tags.attr('src', (i, a) => linkHandling(a, dirName)),
  }, {
    checkType: (type, cheer) => type === 'link' && cheer('link').attr('href'),
    builder: (tags, dirName) => tags.attr('href', (i, a) => linkHandling(a, dirName)),
  }, {
    checkType: (type, cheer) => type === 'script' && cheer('script').attr('src'),
    builder: (tags, dirName) => tags.attr('src', (i, a) => linkHandling(a, dirName)),
  }, {
    checkType: (type, cheer) => cheer(type),
    builder: (tags) => tags,
  },
];

const dataHandling = (data, dirName) => {
  const $ = cheerio.load(data);
  elements.forEach((el) => {
    const { builder } = changeAttribute.find(({ checkType }) => checkType(el, $));
    builder($(el), dirName);
  });
  return $.html();
};

const pageloader = (pageAddress, outputDirectory) => {
  console.log('Ready...'); // delete this!!!
  return axios.get(pageAddress)
    .then((response) => {
      const pathToFile = path.resolve(outputDirectory, `${normalizeName(pageAddress)}.html`);
      return fs.writeFile(pathToFile, dataHandling(response.data, normalizeName(pageAddress)), 'utf-8')
        .then(console.log('Done!'));
    })
    .catch((error) => {
      if (error.response) {
        console.log(`Error response ${error.response.status}`);
        throw error.response.status;
      }
      throw error;
    });
};

export default pageloader;
