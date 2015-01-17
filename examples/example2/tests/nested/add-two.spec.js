var addTwo = require('../../lib/nested/add-two');

it('should add 2', function() {
  expect(addTwo(1)).to.eql(3);
});
