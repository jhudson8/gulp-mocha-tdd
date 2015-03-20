module.exports = function(targetModule, path) {
  
  it('should provide the module to test against as the first parameter', function() {
    expect(targetModule(1)).to.eql(2);
  });

  it('should provide the module directory as the second parameter', function() {
    expect(require(path + '/add-one')(1)).to.eql(2);
  });
};
