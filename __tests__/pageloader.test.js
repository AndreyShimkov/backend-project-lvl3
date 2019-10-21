import '@babel/polyfill';
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import axios from 'axios';
import nock from 'nock';
import httpAdapter from 'axios/lib/adapters/http';
import pageloader from '../src';

const host = 'http://testhost.com';

axios.defaults.host = host;
axios.defaults.adapter = httpAdapter;

const tmpDirectory = os.tmpdir();
const pathToTest = '__tests__/__fixtures__/';

describe('page loader test', () => {
  let testFolderPath;

  beforeEach(async () => {
    testFolderPath = await fs.mkdtemp(path.join(tmpDirectory, 'test-'));
  });

  test('Template Page', async () => {
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

    const promises = addresses.map((v, i) => {
      const fileName = path.join(pathToTest, v);
      const testFileData = i > 3 ? fs.readFile(fileName) : fs.readFile(fileName, 'utf-8');
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

    const fileNameAfter = 'testhost-com-chilling-cafe.html';
    const directoryName = 'testhost-com-chilling-cafe_files';

    const testAfter = await fs.readFile(path.join(pathToTest, fileNameAfter), 'utf-8');
    const pageloaderData = await fs.readFile(path.join(testFolderPath, fileNameAfter), 'utf-8');
    const filelist = await fs.readdir(path.join(testFolderPath, directoryName));

    expect(pageloaderData).toEqual(testAfter);

    expect(filelist).toEqual(filesTest);
  });

  test('ERR: Page not found 404', async () => {
    expect.assertions(1);
    const address = '/notfound';

    nock(host)
      .get(address)
      .reply(404);

    try {
      await pageloader(`${host}${address}`, testFolderPath);
    } catch (e) {
      expect(e.message).toMatch('404');
    }
  });

  test('ERR: No target directory', async () => {
    expect.assertions(1);
    const address = '/123';

    nock(host)
      .get(address)
      .reply(200, '123');

    try {
      await pageloader(`${host}${address}`, '/BadDirectory');
    } catch (e) {
      expect(e.message).toMatch('ENOENT');
    }
  });

  test('ERR: Directory already exists', async () => {
    expect.assertions(1);
    const address = '/simple_page';
    const dirName = 'testhost-com-simple-page_files';

    const data = await fs.readFile(path.join(pathToTest, address), 'utf-8');

    nock(host)
      .get(address)
      .reply(200, data);

    await fs.mkdir(path.join(testFolderPath, dirName));

    try {
      await pageloader(`${host}${address}`, testFolderPath);
    } catch (e) {
      expect(e.message).toMatch('EEXIST');
    }
  });

  test('ERR: File already exists', async () => {
    expect.assertions(1);
    const address = '/simple_page';
    const fileName = 'testhost-com-simple-page.html';

    const data = await fs.readFile(path.join(pathToTest, address), 'utf-8');
    await fs.mkdir(path.join(testFolderPath, fileName));

    nock(host)
      .get(address)
      .reply(200, data);
    try {
      await pageloader(`${host}${address}`, testFolderPath);
    } catch (e) {
      expect(e.message).toMatch('EISDIR');
    }
  });
});
