// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Test} from "forge-std/Test.sol";
import {HandleRegistry} from "../src/HandleRegistry.sol";

contract HandleRegistryTest is Test {
  HandleRegistry internal registry;

  address internal alice = address(0xA11CE);
  address internal bob = address(0xB0B);

  event Registered(bytes32 indexed nameHash, address indexed owner, string name);
  event PrimarySet(address indexed owner, string name);

  function setUp() public {
    registry = new HandleRegistry();
  }

  // --- registration ----------------------------------------------------------------------------

  function test_RegistersAndResolves() public {
    vm.prank(alice);
    registry.register("alice");

    assertEq(registry.resolve("alice"), alice);
    assertFalse(registry.isAvailable("alice"));
  }

  /// Someone registering their only name should not need a second transaction for it to resolve
  /// back to them.
  function test_FirstNameBecomesPrimaryAutomatically() public {
    vm.prank(alice);
    registry.register("alice");

    assertEq(registry.nameOf(alice), "alice");
  }

  function test_SecondNameDoesNotStealPrimary() public {
    vm.startPrank(alice);
    registry.register("alice");
    registry.register("alice-two");
    vm.stopPrank();

    assertEq(registry.nameOf(alice), "alice", "primary changed without being asked");
    assertEq(registry.resolve("alice-two"), alice, "but both resolve");
  }

  function test_SetPrimaryChoosesBetweenOwnedNames() public {
    vm.startPrank(alice);
    registry.register("alice");
    registry.register("alice-two");
    registry.setPrimary("alice-two");
    vm.stopPrank();

    assertEq(registry.nameOf(alice), "alice-two");
  }

  function test_CannotSetPrimaryToANameYouDoNotOwn() public {
    vm.prank(bob);
    registry.register("bob");

    vm.expectRevert(abi.encodeWithSelector(HandleRegistry.NotOwner.selector, "bob", bob));
    vm.prank(alice);
    registry.setPrimary("bob");
  }

  function test_EmitsRegistration() public {
    vm.expectEmit(true, true, false, true, address(registry));
    emit PrimarySet(alice, "alice");
    vm.expectEmit(true, true, false, true, address(registry));
    emit Registered(keccak256(bytes("alice")), alice, "alice");

    vm.prank(alice);
    registry.register("alice");
  }

  // --- first come, first served -----------------------------------------------------------------

  function test_NameCannotBeTakenTwice() public {
    vm.prank(alice);
    registry.register("alice");

    vm.expectRevert(abi.encodeWithSelector(HandleRegistry.NameTaken.selector, "alice", alice));
    vm.prank(bob);
    registry.register("alice");
  }

  /// The revert names the current owner, which is what lets the UI say who holds it rather than
  /// only that the transaction failed.
  function test_FailedRegistrationLeavesTheOwnerAlone() public {
    vm.prank(alice);
    registry.register("alice");

    vm.prank(bob);
    vm.expectRevert();
    registry.register("alice");

    assertEq(registry.resolve("alice"), alice);
  }

  // --- transfer --------------------------------------------------------------------------------

  function test_Transfer() public {
    vm.prank(alice);
    registry.register("alice");

    vm.prank(alice);
    registry.transfer("alice", bob);

    assertEq(registry.resolve("alice"), bob);
  }

  /// The critical one. A reverse record left pointing at a name its owner no longer holds would
  /// show every resolver a stale answer that looks authoritative.
  function test_TransferClearsTheSendersPrimary() public {
    vm.prank(alice);
    registry.register("alice");
    assertEq(registry.nameOf(alice), "alice");

    vm.prank(alice);
    registry.transfer("alice", bob);

    assertEq(registry.nameOf(alice), "", "alice still claims a name she gave away");
    assertEq(registry.nameOf(bob), "alice", "and bob gets it as his primary");
  }

  function test_TransferDoesNotOverwriteAnExistingPrimary() public {
    vm.prank(bob);
    registry.register("bob");
    vm.prank(alice);
    registry.register("alice");

    vm.prank(alice);
    registry.transfer("alice", bob);

    assertEq(registry.nameOf(bob), "bob", "bob's chosen primary was replaced");
    assertEq(registry.resolve("alice"), bob);
  }

  function test_OnlyOwnerCanTransfer() public {
    vm.prank(alice);
    registry.register("alice");

    vm.expectRevert(abi.encodeWithSelector(HandleRegistry.NotOwner.selector, "alice", alice));
    vm.prank(bob);
    registry.transfer("alice", bob);
  }

  function test_CannotTransferToZero() public {
    vm.prank(alice);
    registry.register("alice");

    vm.expectRevert(HandleRegistry.ZeroAddress.selector);
    vm.prank(alice);
    registry.transfer("alice", address(0));
  }

  // --- validation ------------------------------------------------------------------------------

  function test_RejectsTooShortAndTooLong() public {
    vm.expectRevert(abi.encodeWithSelector(HandleRegistry.TooShort.selector, 2, 3));
    registry.register("ab");

    string memory long = _repeat("a", 33);
    vm.expectRevert(abi.encodeWithSelector(HandleRegistry.TooLong.selector, 33, 32));
    registry.register(long);
  }

  function test_AcceptsTheBoundaryLengths() public {
    vm.startPrank(alice);
    registry.register("abc");
    registry.register(_repeat("b", 32));
    vm.stopPrank();

    assertEq(registry.resolve("abc"), alice);
    assertEq(registry.resolve(_repeat("b", 32)), alice);
  }

  /// Uppercase is rejected rather than folded. Folding would mean the string in the log is not the
  /// string the user typed, and every off-chain consumer would have to know to fold too. One
  /// spelling per name is what stops two names looking identical and resolving differently.
  function test_RejectsUppercase() public {
    vm.expectRevert(abi.encodeWithSelector(HandleRegistry.InvalidCharacter.selector, bytes1("A"), uint256(0)));
    registry.register("Alice");
  }

  function test_RejectsSpacesDotsAndSymbols() public {
    vm.expectRevert();
    registry.register("my name");
    vm.expectRevert();
    registry.register("alice.bot");
    vm.expectRevert();
    registry.register("alice_bot");
    vm.expectRevert();
    registry.register(unicode"alicé");
  }

  function test_RejectsLeadingOrTrailingHyphen() public {
    vm.expectRevert(HandleRegistry.LeadingOrTrailingHyphen.selector);
    registry.register("-alice");

    vm.expectRevert(HandleRegistry.LeadingOrTrailingHyphen.selector);
    registry.register("alice-");
  }

  function test_AllowsInteriorHyphensAndDigits() public {
    vm.startPrank(alice);
    registry.register("a-b");
    registry.register("bot-2026");
    registry.register("007");
    vm.stopPrank();

    assertEq(registry.resolve("bot-2026"), alice);
    assertEq(registry.resolve("007"), alice);
  }

  /// `isValid` exists so the UI can reject input as it is typed without duplicating the rules in
  /// TypeScript, where they would drift. It must agree with `register` exactly.
  function test_IsValidAgreesWithRegister() public {
    string[8] memory candidates = ["abc", "a-b", "007", "ab", "-abc", "abc-", "Alice", "a b"];

    for (uint256 i = 0; i < candidates.length; i++) {
      bool valid = registry.isValid(candidates[i]);
      vm.prank(address(uint160(1000 + i)));
      try registry.register(candidates[i]) {
        assertTrue(valid, string.concat("register accepted what isValid rejected: ", candidates[i]));
      } catch {
        assertFalse(valid, string.concat("register rejected what isValid accepted: ", candidates[i]));
      }
    }
  }

  // --- reads on a miss ---------------------------------------------------------------------------

  function test_UnregisteredReadsAreNotErrors() public view {
    assertEq(registry.resolve("nobody"), address(0));
    assertEq(registry.nameOf(address(0xDEAD)), "");
    assertTrue(registry.isAvailable("nobody"));
  }

  // --- gas -------------------------------------------------------------------------------------

  function test_RegisterGasIsBounded() public {
    vm.prank(alice);
    uint256 before = gasleft();
    registry.register("alice");
    uint256 used = before - gasleft();

    emit log_named_uint("register() gas", used);
    // Two slots on a first registration: the forward record and the primary string.
    assertLt(used, 130_000, "register() got more expensive");
  }

  // --- properties ------------------------------------------------------------------------------

  function testFuzz_RegisteringIsIdempotentlyExclusive(address first, address second) public {
    vm.assume(first != address(0) && second != address(0) && first != second);

    vm.prank(first);
    registry.register("contested");

    vm.prank(second);
    vm.expectRevert();
    registry.register("contested");

    assertEq(registry.resolve("contested"), first);
  }

  function _repeat(string memory ch, uint256 times) internal pure returns (string memory out) {
    for (uint256 i = 0; i < times; i++) out = string.concat(out, ch);
  }
}
