var addOne = require('../../lib/add-one');

it('should add 1', function() {
	expect(addOne(1)).to.eql(2);
});
