import '@babel/polyfill';
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
// import axios from 'axios';
import nock from 'nock';
import pageloader from '../src';

const host = 'http://testhost.com';

// axios.defaults.host = host;

const tmpDirectory = os.tmpdir();
const pathToTest = '__tests__/__fixtures__/';

const addresses = ['/chilling_cafe',
  '/chilling/fontawesome/css/all.min.css',
  '/chilling/css/tooplate-chilling-cafe.css',
  '/chilling/js/jquery',
  '/chilling/img/chilling-cafe-11.jpg',
  '/chilling/img/chilling-cafe-12.jpg',
  '/chilling/img/chilling-cafe-13.jpg',
];

const filesTest = [
  'chilling-css-tooplate-chilling-cafe.css',
  'chilling-fontawesome-css-all-min.css',
  'chilling-img-chilling-cafe-11.jpg',
  'chilling-img-chilling-cafe-12.jpg',
  'chilling-img-chilling-cafe-13.jpg',
  'chilling-js-jquery',
];

const linkTests = [
  ['ERR: Bad script link', '/simple_page_script', '/404/bad_file.js'],
  ['ERR: Bad img file link', '/simple_page_img', '/404/bad_file.jpg'],
  ['ERR: Bad css file link', '/simple_page_css', '/404/bad_file.css'],
];

describe('Pageloader test', () => {
  let testFolderPath;

  beforeEach(async () => {
    testFolderPath = await fs.mkdtemp(path.join(tmpDirectory, 'test-'));
  });

  test('Template Page', async () => {
    const fileNameAfter = 'testhost-com-chilling-cafe.html';
    const directoryName = 'testhost-com-chilling-cafe_files';
    const promises = addresses.map((v) => {
      const fileName = path.join(pathToTest, v);
      const testFileData = fs.readFile(fileName);
      return testFileData;
    });

    const tests = await Promise.all(promises);

    addresses.forEach((address, i) => {
      const dataBefore = tests[i];
      nock(host)
        .get(address)
        .reply(200, dataBefore);
    });

    await pageloader(`${host}${addresses[0]}`, testFolderPath);

    const testAfter = await fs.readFile(path.join(pathToTest, fileNameAfter), 'utf-8');
    const pageloaderData = await fs.readFile(path.join(testFolderPath, fileNameAfter), 'utf-8');
    const filelist = await fs.readdir(path.join(testFolderPath, directoryName));

    expect(pageloaderData).toEqual(testAfter);
    expect(filelist).toEqual(filesTest);
  });

  test('ERR: Page not found 404', async () => {
    const address = '/notfound';

    nock(host)
      .get(address)
      .reply(404);

    await expect(pageloader(`${host}${address}`, testFolderPath)).rejects
      .toThrow('Request failed with status code 404');
  });

  describe.each(linkTests)('Bad links test',
    (name, address, link) => {
      test(name, async () => {
        const fileName = path.join(pathToTest, address);
        const data = await fs.readFile(fileName, 'utf-8');

        nock(host)
          .get(address)
          .reply(200, data);

        nock(host)
          .get(link)
          .reply(404);

        await expect(pageloader(`${host}${address}`, testFolderPath)).rejects
          .toThrow('Request failed with status code 404');
      });
    });

  test('ERR: No target directory', async () => {
    const address = '/BadDirectory';

    nock(host)
      .get(address)
      .reply(200, '123');

    await expect(pageloader(`${host}${address}`, '/BadDirectory')).rejects
      .toThrow('ENOENT');
  });

  test('ERR: Directory *_files already exists', async () => {
    const address = '/simple_page';
    const dirName = 'testhost-com-simple-page_files';

    const data = await fs.readFile(path.join(pathToTest, address), 'utf-8');

    nock(host)
      .get(address)
      .reply(200, data);

    await fs.mkdir(path.join(testFolderPath, dirName));

    await expect(pageloader(`${host}${address}`, testFolderPath)).rejects
      .toThrow('EEXIST');
  });

  test('ERR: File *.html already exists', async () => {
    const address = '/simple_page';
    const fileName = 'testhost-com-simple-page.html';

    const data = await fs.readFile(path.join(pathToTest, address), 'utf-8');
    await fs.mkdir(path.join(testFolderPath, fileName));

    nock(host)
      .get(address)
      .reply(200, data);

    await expect(pageloader(`${host}${address}`, testFolderPath)).rejects
      .toThrow('EISDIR');
  });
});
