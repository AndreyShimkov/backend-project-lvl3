/*
const elements = ['script', 'link'];

const linkHandling = (link, dir) => {
  if (link.indexOf('http') >= 0) {
    return link;
  }
  return axios.get(link)
    .then((responce) => {
      console.log(responce.path);
    })
    .catch((error) => console.log(error));
};

// GET request for remote image
axios({
  method: 'get',
  url: 'http://bit.ly/2mTM3nY',
  responseType: 'stream'
})
  .then(function (response) {
    response.data.pipe(fs.createWriteStream('ada_lovelace.jpg'))
  });

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

*/
