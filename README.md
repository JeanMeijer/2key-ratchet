# 2key-ratchet

[![CircleCI](https://circleci.com/gh/PeculiarVentures/2key-ratchet.svg?style=svg&circle-token=29f5d4fefececbe5668f0c0858cc583e4e130765)](https://circleci.com/gh/PeculiarVentures/2key-ratchet)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=flat)](https://raw.githubusercontent.com/PeculiarVentures/2key-ratchet/master/LICENSE.md)


`2key-ratchet` is an implementation of a [Double Ratchet](https://whispersystems.org/docs/specifications/doubleratchet/) protocol and [X3DH](https://whispersystems.org/docs/specifications/x3dh) in TypeScript utilizing WebCrypto. 

The Double Ratchet protocol and X3DH were designed with goals of providing both forward secrecy and cryptographic deniability. Importantly there have been several independent [security reviews](https://eprint.iacr.org/2016/1013.pdf) that concluded they deliver on those goals.

The term “Double Ratchet” comes from how the protocol makes sure each message gets a new key: their [Diffie-Hellman keys are “ratcheted”](https://github.com/PeculiarVentures/2key-ratchet/blob/master/src/classes/asym_ratchet.ts) by each new message exchange; and so are the send/receive chains (the [“symmetric-key ratchet”](https://github.com/PeculiarVentures/2key-ratchet/blob/master/src/classes/sym_ratchet.ts)).

There are a few [differences](https://github.com/PeculiarVentures/2key-ratchet/blob/master/DIFFERENCES.md) between the original specifications and `2key-ratchet`, the most significant being, as it’s name suggests, it uses [two keys](https://github.com/PeculiarVentures/2key-ratchet/blob/3538a1481b4249830549e1c1d251fb6a7a7512ec/src/classes/data/identity.ts#L18-L19), one for authentication and another for key exchange. The other big one is that secp256r1 is used instead of curve25519 because browsers do not yet support this curve natively.

See the [ARCHITECTURE](https://github.com/PeculiarVentures/2key-ratchet/blob/master/ARCHITECTURE.md) file to better understand the library structure.

For licensing information, see the [LICENSE](https://github.com/PeculiarVentures/2key-ratchet/blob/master/LICENSE.md) file.

## Instructions

### Installation

```
npm install 2key-ratchet
```

| Name            | Size   | Description                                    |
|-----------------|--------|------------------------------------------------|
| 2key-ratchet.js |  66 Kb | UMD module without external modules            | 


### Usage

First you need to require the library:

NODEJS:

```javascript
let DKeyRatchet = require("2key-ratchet");
```

BROWSER:

```html
<script src="2key-ratchet.js"></script>
```

__NOTE:__ You have to import [tslib](https://github.com/Microsoft/tslib) and [protobufjs](https://github.com/dcodeIO/ProtoBuf.js/#browsers) for browser too.

The `DKeyRatchet` namespace will always be available globally / also supports AMD loaders.

Then generate an Identity Key:

```javascript
let AliceID;
DKeyRatchet.Identity.create(16453);
    .then((id) => {
        AliceID = id;
    });
```

You will also need to create your signed PreKeys:

```javascript
DKeyRatchet.PreKey.create(1)
    .then((preKey) => {
        AliceID.signedPreKeys.save(preKey.id.toString(), preKey);
    });
```

Create your PreKey message bundle:

```javascript
let bundle = new DKeyRatchet.PreKeyBundleProtocol();

bundle.identity.fill(AliceID)
    .then(() => {
        bundle.registrationId = AliceID.id;
        const preKey = AliceID.signedPreKeys.load("1");
        bundle.preKeySigned.id = 1;
        bundle.preKeySigned.key = preKey.key.publicKey;
        return bundle.preKeySigned.sign(AliceID.signingKey.privateKey);
    })
    .then(() => {
        return bundle.exportProtocol();
    })
    .then((ab) => {
        console.log(ab); // ArrayBuffer {byteLength: 348}
    });
``` 

Import the generated PreKey message bundle:

```javascript
DKeyRatchet.PreKeyBundleProtocol.importProtocol(ab)
    .then((bundle) => {
        // check signed prekey
        return bundle.preKeySigned.verify(AliceID.signingKey.public);
    })
    .then((trusted) => {
        if (!trusted)
            throw new Error("PreKey is not trusted");
    })
```

Start a session using the PreKey message bundle:

```javascript
DKeyRatchet.AsymmetricRatchet.create(BobID, bundle)
    .then((cipher) => {
        return cipher.encrypt(DKeyRatchet.Convert.FromUtf8String("Hello world!"));
    })
    .then((preKeyMessage) => {
        return preKeyMessage.exportProtocol();
    })
    .then((ab) => {
        console.log(ab); // ArrayBuffer {byteLength: 408}
    });
```

On the other side you would do the same:

```javascript
DKeyRatchet.AsymmetricRatchet.create(AliceID, preKeyMessage)
    .then((cipher) => {
        return cipher.decrypt(preKeyMessage.signedMessage);
    })
    .then((message) => {
        console.log(DKeyRatchet.Convert.ToUtf8String(message)); // Hello world!
    })
```

We have a [complete example you can look at here](https://github.com/PeculiarVentures/2key-ratchet/tree/master/src/examples).

## Contributing

If you've found an problem with 2key-ratchet, please open a new issue. Feature requests are welcome, too.

Pull requests – patches, improvements, new features – are a fantastic help. Please ask first before embarking on any significant pull request (e.g., implementing new features).

## Note

Bruce Schneier famously said "If you think cryptography can solve your problem, then you don't understand your problem and you don't understand cryptography". The point being, using 2key-ratchet, or any other "cryptography related" library, will not necessarily make your product secure. 

In short, there is a lot more to making a secure product than adding cryptography, [this is a great book to get you familiar with thinking defensively](https://www.amazon.com/Threat-Modeling-Designing-Adam-Shostack/dp/1118809998).

### WARNING
Though this library is based on [the Double Ratchet Algorithm](https://whispersystems.org/docs/specifications/doubleratchet/) and [the X3DH Key Agreement Protocol](https://whispersystems.org/docs/specifications/x3dh/) several [changes](https://github.com/PeculiarVentures/2key-ratchet/blob/master/DIFFERENCES.md) have been made that could change the security properties they offer. At this time you should consider this implementation appropriate for experimentation until further security reviews are completed.

## Acknowledgements
Both Double Ratchet and X3DH were designed by Trevor Perrin and Moxie Marlinspike, we thank them for their work.

## Related
- [A Formal Security Analysis of the Signal Messaging Protocol](https://eprint.iacr.org/2016/1013.pdf)
- [WhatsApp Security Paper Analysis](https://courses.csail.mit.edu/6.857/2016/files/36.pdf)
- [Web Cryptography API](https://www.w3.org/TR/2016/PR-WebCryptoAPI-20161215/)
- [The X3DH Key Agreement Protocol](https://whispersystems.org/docs/specifications/x3dh/)
- [The Double Ratchet Algorithm](https://whispersystems.org/docs/specifications/doubleratchet/)
- [Google Key Transparency](https://github.com/google/keytransparency)
- [OMEMO Multi-End Message and Object Encryption](https://xmpp.org/extensions/xep-0384.html)
- [Matrix OLM](https://matrix.org/docs/guides/e2e_implementation.html)
- [Double Ratchet & the Quantum Computers](https://www.fredericjacobs.com/blog/2016/04/07/qc-axolotl/)
- [CryptoCat Encryption Overview](https://crypto.cat/security.html)
