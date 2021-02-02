let preloadImages = (array) => {
    if (!preloadImages.list) {
        preloadImages.list = [];
    }
    let list = preloadImages.list;
    for (let i = 0; i < array.length; i++) {
        let img = new Image();
        img.onload = function()  {
            let index = list.indexOf(this);
            if (index !== -1) {
                list.splice(index, 1);
            }
        }
        list.push(img);
        img.src = array[i];
    }
}
preloadImages(['images/24hr-Earth-5K-0.jpg',
				'images/24hr-Earth-5K-1.jpg',
				'images/24hr-Earth-5K-2.jpg',
				'images/24hr-Earth-5K-3.jpg',
				'images/24hr-Earth-5K-4.jpg',
				'images/24hr-Earth-5K-5.jpg',
				'images/24hr-Earth-5K-6.jpg',
				'images/24hr-Earth-5K-7.jpg',
				'images/24hr-Earth-5K-8.jpg',
				'images/24hr-Earth-5K-9.jpg',
				'images/24hr-Earth-5K-10.jpg',
				'images/24hr-Earth-5K-11.jpg',
				'images/24hr-Earth-5K-12.jpg',
				'images/24hr-Earth-5K-13.jpg',
				'images/24hr-Earth-5K-14.jpg',
				'images/24hr-Earth-5K-15.jpg',
        'images/24hr-Earth-5K-16.jpg',
				'images/24hr-LosAngeles2019-5K-0.jpg',
				'images/24hr-LosAngeles2019-5K-1.jpg',
				'images/24hr-LosAngeles2019-5K-2.jpg',
				'images/24hr-LosAngeles2019-5K-3.jpg',
				'images/24hr-LosAngeles2019-5K-4.jpg',
				'images/24hr-LosAngeles2019-5K-5.jpg',
				'images/24hr-LosAngeles2019-5K-6.jpg',
				'images/24hr-LosAngeles2019-5K-7.jpg',
				'images/24hr-LosAngeles2019-5K-8.jpg',
				'images/24hr-LosAngeles2019-5K-9.jpg',
				'images/24hr-LosAngeles2019-5K-10.jpg',
				'images/24hr-LosAngeles2019-5K-11.jpg',
				'images/24hr-LosAngeles2019-5K-12.jpg',
				'images/24hr-LosAngeles2019-5K-13.jpg',
				'images/24hr-LosAngeles2019-5K-14.jpg',
				'images/24hr-LosAngeles2019-5K-15.jpg',
        'images/24hr-LosAngeles2019-5K-16.jpg',
				'images/24hr-MonumentValley-5K-0.jpg',
				'images/24hr-MonumentValley-5K-1.jpg',
				'images/24hr-MonumentValley-5K-2.jpg',
				'images/24hr-MonumentValley-5K-3.jpg',
				'images/24hr-MonumentValley-5K-4.jpg',
				'images/24hr-MonumentValley-5K-5.jpg',
				'images/24hr-MonumentValley-5K-6.jpg',
				'images/24hr-MonumentValley-5K-8.jpg',
				'images/24hr-MonumentValley-5K-9.jpg',
				'images/24hr-MonumentValley-5K-10.jpg',
				'images/24hr-MonumentValley-5K-11.jpg',
				'images/24hr-MonumentValley-5K-12.jpg',
				'images/24hr-MonumentValley-5K-13.jpg',
				'images/24hr-MonumentValley-5K-14.jpg',
				'images/24hr-MonumentValley-5K-15.jpg',
        'images/24hr-MonumentValley-5K-16.jpg'
				]);
