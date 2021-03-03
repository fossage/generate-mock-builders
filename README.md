# generate-mock-builders

## Installation

> yarn add -D generate-mock-builders

or

> npm i -d generate-mock-builders

## What is it?
This library generates mock data builder functions from JSON api responses. The idea is that you can configure the tool to make a request or series of requests to an api, then the tool will parse the responses and generate builder functions for each response as well as any sub-pieces of structured data in the response. The goal of each builder function is to set you up with some defaults and allow you to override specific properties where necessary.

For example:

```javascript
// given the following JSON response for a resource called User:
const user = {
  firstName: 'John',
  lastName: 'Doe',
  pets: [
    { name: 'Fluffy', type: 'dog', age: 4},
    { name: 'Steve', type: 'dog', age: 6},
    { name: 'Dave', type: 'snake', age: 2},
  ]
}

// we would generate the following builder functions:

function buildUser(overrides = {}) {
  return Object.assign({
    firstName: 'John',
    lastName: 'Doe',
    pets: buildPets()
  }, overrides)
}

function buildPets() {
  return [
    buildPet(), 
    buildPet({name:'Steve', age: 6}),
    buildPet({name:'Dave', type: 'snake', age: 2})
  ]
}

function buildPet(overrides = {}) {
  return Object.assign({ 
    name: 'Fluffy', 
    type: 'dog', 
    age: 4
  }, overrides)
}
```

As you can see from the example, we create a separate builder for each piece of structured data. For collections of data, we use the data of the first item in the collection as the default and then only override the properties necessary in the builder function for that collection item when building up subsequent items. One important thing to note is that this assumes the data in the collection is relatively homogeneous.

## How to use it

After you've installed the tool, you need to create a `generate-mock-builders.config.js` file in the root of your project. The setup of the file is as follows:

```javascript
module.exports = {
  // The directory where you would like the tool to output the builder files to
  //===========================================================================
  outputDir: './app/builders', 

  // The extenstion of the builder files to be written. Note that setting it to '.ts'
  // merely changes the extension of the written file but does not(currently) generate
  // any type information.
  //===========================================================================
  fileExtension: '.js',

  // An optional transform function which will allow you to transform the output
  // of a given file before writing it to disk. It can be sync or async.
  //===========================================================================
  outputTransform: async (text, fileName) => {
   const out = await prettier
     .resolveConfig('./prettierrc')
     .then(options => prettier.format(text, options))
  
   return '/* eslint-disable id-length */\n' + out
  },

  // This is where we will configure the request orchestrator which will make
  // requests to a given JSON api and then feed them into the builder generator.
  //===========================================================================
  requests: {

    // Here we can set the root path of our JSON api so we don't have to repeat it
    // in each request.
    //===========================================================================
    apiRootPath: 'https://foo.bar.com/api',
    
    // This is where we will define our actual resource requests. We define this as an array of
    // arrays to allow for parallelization of requests while ensuring requests that depend
    // on data from the response of a previous request aren't sent until that response has been
    // receieved. For example in the following structure: [[...requestsA], [...requestsB]],
    // everything in requestsA will go in parallel, but nothing in requestsB will fire until
    // we have received all responses from requestsA.
    //===========================================================================
    resources: [
      [
        {
          // The name of the resource being requested. This name will be used
          // to name the builders when generating the builder functions.
          //=================================================================
          name: 'profile',

          // A function that takes in the api object which exposes get, post, put, patch,
          // and delete methods. This is a simple wrapper around the request-promise package
          // https://www.npmjs.com/package/request-promise
          // It also takes in the current state, which will contain all of the response data
          // thus far assigned to the resource name. Lastly it takes in any selectors defined
          // which can be defined by any resource fetcher config to allow subsequent functions
          // easy access to any data from the resource on which they were defined.
          //=================================================================
          request: (api, state, selectors) => {
            return api.post({
              url: 'sign_in',
              body: {
                email: 'test@example.com',
                password: 'abc123',
              },
            })
          },
          selectors: {
            bestFriend: ({ profile }) => {
              const bestFriend = profile.friends.find(
                friend => friend.type === 'best'
              )

              return return bestFriend
            }
          },
        },
      ],
      [
        {
          name: 'bestFriendProfile',
          request: (api, state, { bestFriend }) => {
            return api.get({ url: `users/${bestFriend.id}` })
          },
        },
        {
          name: 'pets',
          request: (api, state, selectors) => {
            return api.get({ url: `users/${state.profile.id}/pets` })
          },

          // An optional function that allows you to arbitrarily transform a response
          // before it is sent off the the builder generator. Note that the transformed
          // version is also what will be stored on the state value that is passed into
          // subsequent request functions.
          //=================================================================
          transform: response => response.slice(0, 5)
        },
      ]
  },
}
```