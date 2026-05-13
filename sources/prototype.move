module iwallet::prototype;

use sui::table;
use std::string::String;
use sui::coin;
use sui::transfer::{Self, Receiving};


public struct IIdentity<phantom T> has key, store {
    id: UID,
    name: std::string::String,
    balances: table::Table<String, sui::balance::Balance<T>>,
}




entry fun get_iidentity<T>(identity: &IIdentity<T>): address {

    identity.id.uid_to_address()
}

public fun get_iidentity_v2<T>(identity: &IIdentity<T>): address {
    identity.id.uid_to_address()
}


entry fun create_iidentity<T>(
    name: String,
    ctx: &mut TxContext
) {
    let identity = IIdentity<T> {
        id: object::new(ctx),
        name,
        balances: table::new<String, sui::balance::Balance<T>>(ctx),
    };

    transfer::public_share_object(identity);
}

public fun withdraw_received_coin<T>(
    identity: &mut IIdentity<T>,
    sent_coin: Receiving<coin::Coin<T>>,
    recipient: address,
) {
    // 1. Authenticate the coin (verifies it was sent to this identity)
    let coin = transfer::public_receive<coin::Coin<T>>(&mut identity.id, sent_coin);

    // 2. Transfer it out to the human user
    transfer::public_transfer(coin, recipient);
}
