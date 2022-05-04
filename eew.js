const { default: axios } = require('axios');

(async () => {
    const rawData = await axios.get('https://api.p2pquake.net/v2/history');
    console.log(rawData.data);
})();