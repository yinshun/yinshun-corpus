var loop=0;
	var isSorted=function(arr) {
		var a=0,b=1,f=1;
		while (f<arr.length ) {
			f = a+b;
			if (arr[a]>arr[b]) return false;
			a=b;
			b=f;
			loop++;
		}

		return true;
	}

	var arr=[];
	for (var i=0;i<100000;i++){
		arr.push(Math.random()*i);
	}


	console.log(isSorted(arr));
	console.log(loop)