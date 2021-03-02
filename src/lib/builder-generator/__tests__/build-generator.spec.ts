// import user from './user.json';

import BuildGenerator from '../index';

const unformat = (str: string) => str.replace(/\s+/g, '');

describe(`the BuildGenerator class`, () => {
  const profile = {
    name: 'John',
    preferences: {
      showProfilePicture: 'true',
      favoriteColors: ['red', 'blue'],
    },
    friends: [
      { name: 'Steve', score: 4, foo: 'bar' },
      { name: 'Joe', score: 4, foo: 'baz' },
    ],
  };

  const club = {
    name: 'cool club',
    members: [
      { name: 'Steve', rank: 'standard' },
      { name: 'Joe', rank: 'standard' },
      { name: 'Bob', rank: 'organizer' },
    ],
  };

  it('will break each top level entity into sub-enteties', () => {
    const { builders } = new BuildGenerator({ profile, club });
    expect(builders.club).toBeDefined();
    expect(builders.club.club).toBeDefined();
    expect(builders.club.clubMembers).toBeDefined();
    expect(builders.club.clubMember).toBeDefined();

    expect(builders.profile).toBeDefined();
    expect(builders.profile.profile).toBeDefined();
    expect(builders.profile.profilePreferences).toBeDefined();
    expect(builders.profile.profilePreferencesFavoriteColors).toBeDefined();
    expect(builders.profile.profileFriends).toBeDefined();
    expect(builders.profile.profileFriend).toBeDefined();
  });

  it('will generate a builder definition for each sub-entity', () => {
    const { builders } = new BuildGenerator({ profile, club });
    expect(builders.club.club.builderDef).toBeDefined();
    expect(builders.club.clubMembers.builderDef).toBeDefined();
    expect(builders.club.clubMember.builderDef).toBeDefined();

    expect(builders.profile.profile.builderDef).toBeDefined();
    expect(builders.profile.profilePreferences.builderDef).toBeDefined();
    expect(
      builders.profile.profilePreferencesFavoriteColors.builderDef
    ).toBeDefined();
    expect(builders.profile.profileFriends.builderDef).toBeDefined();
    expect(builders.profile.profileFriend.builderDef).toBeDefined();
  });

  it(`will make each builder definition by composing builder definitions for any sub entities`, () => {
    const data = { foo: 'bar', thing: { baz: 'bat' } };
    const { builders } = new BuildGenerator({ data });

    expect(unformat(builders.data.data.builderDef)).toBe(
      unformat(`
    function buildData(overrides = {}) {
      return Object.assign({
        foo: 'bar',
        thing: buildDataThing(),
      }, overrides)
    }
    `)
    );

    expect(unformat(builders.data.dataThing.builderDef)).toBe(
      unformat(`
    function buildDataThing(overrides = {}) {
      return Object.assign({
        baz: 'bat',
      }, overrides)
    }
    `)
    );
  });

  it(`will use the first item in a collection of items as a 
  default value and will create any subsequent items by calling 
  the item builder function only passing in the necessary overrides`, () => {
    const club = {
      name: 'cool club',
      members: [
        { name: 'Steve', rank: 'standard' },
        { name: 'Joe', rank: 'standard' },
        { name: 'Bob', rank: 'organizer' },
      ],
    };

    const { builders } = new BuildGenerator({ club });
    expect(unformat(builders.club.clubMembers.builderDef)).toBe(
      unformat(`
    function buildClubMembers() {
      return [
        buildClubMember(),
        buildClubMember({name: 'Joe',}),
        buildClubMember({name: 'Bob', rank: 'organizer',}),
      ]
    }
    `)
    );
  });

  it(`will handle array names that are singular`, () => {
    const todos = {
      thingsToDo: [
        { type: 'TODO', description: 'get milk' },
        { type: 'TODO', description: 'get eggs' },
      ],
    };
    const { builders } = new BuildGenerator({ todos });

    expect(unformat(builders.todos.todosThingsToDo.builderDef)).toBe(
      unformat(`
      function buildTodosThingsToDo() {
        return [ buildTodosThingsToDoEntry(), buildTodosThingsToDoEntry({
          description: 'get eggs',
        }),]
      }
    `)
    );

    expect(unformat(builders.todos.todosThingsToDoEntry.builderDef)).toBe(
      unformat(`
    function buildTodosThingsToDoEntry(overrides = {}) {
      return Object.assign({
        type: 'TODO',
        description: 'get milk',
      }, overrides)
    }
    `)
    );
  });
});
