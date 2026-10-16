// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/// @title HandleRegistry
/// @notice First-come-first-served `.bot` names, pointing at an address.
///
/// @dev Deliberately not ENS. No expiry, no renewals, no auctions, no fees — a name is claimed
/// once and held until its owner transfers it. That removes a whole category of things that can
/// go wrong (a name silently lapsing, a renewal the owner never saw) at the cost of permanent
/// squatting, which is the honest trade and is stated in the UI rather than hidden.
///
/// Names are stored by hash. The string lives in the registration log and in the owner's reverse
/// record, so a resolver never pays to store a string twice.
contract HandleRegistry {
  /// @dev Forward: hash of the name to the address it resolves to.
  mapping(bytes32 nameHash => address owner) private _owners;

  /// @dev Reverse: an address to the name it wants to be known by. Stored as a string because the
  /// whole point of a reverse lookup is to get the characters back; a hash would be useless.
  /// An address holding several names has one primary, which it chooses.
  mapping(address owner => string name) private _primary;

  event Registered(bytes32 indexed nameHash, address indexed owner, string name);
  event Transferred(bytes32 indexed nameHash, address indexed from, address indexed to, string name);
  event PrimarySet(address indexed owner, string name);

  error NameTaken(string name, address owner);
  error NotOwner(string name, address owner);
  error TooShort(uint256 length, uint256 min);
  error TooLong(uint256 length, uint256 max);
  error InvalidCharacter(bytes1 character, uint256 position);
  error LeadingOrTrailingHyphen();
  error ZeroAddress();

  uint256 public constant MIN_LENGTH = 3;
  uint256 public constant MAX_LENGTH = 32;

  // --- registration ------------------------------------------------------------------------------

  /// @notice Claim a name. Free beyond gas.
  function register(string calldata name) external {
    _validate(name);

    bytes32 nameHash = keccak256(bytes(name));
    address current = _owners[nameHash];
    if (current != address(0)) revert NameTaken(name, current);

    _owners[nameHash] = msg.sender;

    // A first registration becomes the caller's primary name, because someone registering their
    // only name should not then need a second transaction for it to resolve back to them.
    if (bytes(_primary[msg.sender]).length == 0) {
      _primary[msg.sender] = name;
      emit PrimarySet(msg.sender, name);
    }

    emit Registered(nameHash, msg.sender, name);
  }

  /// @notice Hand a name to someone else.
  function transfer(string calldata name, address to) external {
    if (to == address(0)) revert ZeroAddress();

    bytes32 nameHash = keccak256(bytes(name));
    address owner = _owners[nameHash];
    if (owner != msg.sender) revert NotOwner(name, owner);

    _owners[nameHash] = to;

    // The sender's reverse record must not keep pointing at a name they no longer hold, or every
    // resolver would show a stale answer that looks authoritative.
    if (keccak256(bytes(_primary[msg.sender])) == nameHash) {
      delete _primary[msg.sender];
      emit PrimarySet(msg.sender, "");
    }
    if (bytes(_primary[to]).length == 0) {
      _primary[to] = name;
      emit PrimarySet(to, name);
    }

    emit Transferred(nameHash, msg.sender, to, name);
  }

  /// @notice Choose which of your names resolves back to you.
  function setPrimary(string calldata name) external {
    bytes32 nameHash = keccak256(bytes(name));
    address owner = _owners[nameHash];
    if (owner != msg.sender) revert NotOwner(name, owner);

    _primary[msg.sender] = name;
    emit PrimarySet(msg.sender, name);
  }

  // --- reads ---------------------------------------------------------------------------------

  /// @notice The address a name points at, or the zero address if unregistered.
  /// @dev Returns zero rather than reverting: "nobody has this name" is an ordinary answer to a
  /// lookup, and a revert would make an unregistered name indistinguishable from an unreachable
  /// node.
  function resolve(string calldata name) external view returns (address) {
    return _owners[keccak256(bytes(name))];
  }

  /// @notice The name an address wants to be known by, or "" if it has none.
  function nameOf(address owner) external view returns (string memory) {
    return _primary[owner];
  }

  function isAvailable(string calldata name) external view returns (bool) {
    return _owners[keccak256(bytes(name))] == address(0);
  }

  /// @notice Whether a name could ever be registered, independent of whether it is taken.
  /// @dev Lets the UI reject "AB" or "my name" as the user types, without a transaction and
  /// without duplicating the rules in TypeScript where they could drift.
  function isValid(string calldata name) external pure returns (bool) {
    bytes calldata raw = bytes(name);
    if (raw.length < MIN_LENGTH || raw.length > MAX_LENGTH) return false;
    if (raw[0] == "-" || raw[raw.length - 1] == "-") return false;
    for (uint256 i = 0; i < raw.length; i++) {
      if (!_allowed(raw[i])) return false;
    }
    return true;
  }

  // --- validation ------------------------------------------------------------------------------

  /// @dev Lowercase letters, digits and interior hyphens only.
  ///
  /// Uppercase is rejected rather than lowercased on the way in. Folding case in the contract
  /// would mean `Alice` and `alice` are the same name, which is correct, but it would also mean
  /// the string stored in the log is not the string the user typed — and every off-chain consumer
  /// would have to know to fold too. Rejecting keeps exactly one spelling of every name, which is
  /// what makes a name worth having: no two names can look identical and resolve differently.
  function _validate(string calldata name) private pure {
    bytes calldata raw = bytes(name);

    if (raw.length < MIN_LENGTH) revert TooShort(raw.length, MIN_LENGTH);
    if (raw.length > MAX_LENGTH) revert TooLong(raw.length, MAX_LENGTH);
    if (raw[0] == "-" || raw[raw.length - 1] == "-") revert LeadingOrTrailingHyphen();

    for (uint256 i = 0; i < raw.length; i++) {
      if (!_allowed(raw[i])) revert InvalidCharacter(raw[i], i);
    }
  }

  function _allowed(bytes1 c) private pure returns (bool) {
    return (c >= 0x61 && c <= 0x7A) // a-z
      || (c >= 0x30 && c <= 0x39) // 0-9
      || c == 0x2D; // -
  }
}
