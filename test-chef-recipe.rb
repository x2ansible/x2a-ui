# Test Chef Recipe
name 'test-cookbook'
version '1.0.0'

file '/tmp/test.txt' do
  content 'Hello World'
  mode '0644'
end
