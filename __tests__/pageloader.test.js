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

  test('Template Site', async () => {
    // https://www.templatemo.com
    const testPage = '/chilling_cafe';

    const addresses = ['/chilling_cafe',
      '/chilling/fontawesome/css/all.min.css',
      '/chilling/css/tooplate-chilling-cafe.css',
      '/chilling/js/jquery',
      '/chilling/img/chilling-cafe-11.jpg',
      '/chilling/img/chilling-cafe-12.jpg',
      '/chilling/img/chilling-cafe-13.jpg',
    ];

    const fileNameBefore = 'chilling_cafe.html';
    const fileNameAfter = 'testhost-com-chilling-cafe.html';
    const directoryName = 'testhost-com-chilling-cafe_files';

    const dataBefore = await fs.readFile(path.join(pathToTest, fileNameBefore), 'utf-8');
    const dataAfter = await fs.readFile(path.join(pathToTest, fileNameAfter), 'utf-8');

    addresses.forEach((address) => {
      nock(host)
        .get(address)
        .reply(200, dataBefore);
    });

    await pageloader(`${host}${testPage}`, testFolderPath);

    const content = await fs.readFile(path.join(testFolderPath, fileNameAfter), 'utf-8');

    const filelist = await fs.readdir(path.join(testFolderPath, directoryName));

    console.log(filelist);

    console.log(testFolderPath);

    expect(content).toEqual(dataAfter);
  });
});
