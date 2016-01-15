
import {bind, click, cls, transition, ctrl} from './decorators';
import {Controller} from './controller';
import {o, Observable} from './observable';
import {Atom, ObservableAtom} from './atom';
import {Eventable} from './eventable';
import {pathget, pathset, identity, noop, clonedeep, merge, debounce} from './helpers'


function c(elt, attrs, ...children) {
  let atom = null;
  attrs = attrs || {};

  let decorators = attrs.$$;

  if (decorators) {
    delete attrs.$$;
    if (!Array.isArray(decorators)) decorators = [decorators];
  }

  if (typeof elt === 'string') {
    // If we have a string, then it is a simple html element.
    atom = new Atom(elt, attrs, children);

  } else if (typeof elt === 'function') {
    // If it is a function, then the element is composite.
    atom = elt(attrs, children)
    atom.builder = elt

    // The following code forwards diverse and common html attributes automatically.
    if (attrs.class) {
      if (atom.attrs.class)
        // NOTE the fact that we use o() does not necessarily create an Observable ;
        // if neither of the class attributes are, then the function returns directly
        // with the value.
        atom.attrs.class = o(attrs.class, atom.attrs.class, (c1, c2) => `${c1} ${c2}`);
      else atom.attrs.class = attrs.class;
    }

    // Forward the style attriute.
    if (attrs.style) {
      if (atom.attrs.style)
        atom.attrs.style = o(attrs.style, atom.attrs.style, (c1, c2) => `${c1};${c2}`);
      else atom.attrs.style = attrs.style;
    }

    for (let att of ['id', 'tabindex']) {
      if (attrs[att]) // The last one to speak wins
        atom.attrs[att] = attrs[att];
    }

  } else {
    throw new Error('wrong type')
  }

  // A decorator generally sets up events and add controllers
  if (decorators) {
    for (let d of decorators) {
      let decorated = d(atom);
      atom = decorated instanceof Atom ? decorated : atom;
    }
  }

  // At this point, we have an atom that is ready to be inserted.
  return atom;
}

function Fragment(attrs, children) {
  return children;
}

module.exports = {
  // core
  c, Fragment,
  // observable
  o, Observable,
  // atom
  Atom, ObservableAtom,
  // controller
  Controller,
  // decorators
  bind, click, cls, transition, ctrl,
  // helpers
  pathget, pathset, identity, noop, clonedeep, merge, debounce,
  // eventable
  Eventable
};
