/* global describe, it, before, lux, utils, luxStoreCh, postal, sinon */

describe( "luxJS - Dispatcher", function() {
	var dispatcher,
		dispatcherChannel = postal.channel( "lux.dispatcher" ),
		testAction = "test",
		handler = sinon.spy();

	beforeEach( function() {
		// lux exposes the single dispatcher instance, but for tests create a new one each time
		dispatcher = new lux.dispatcher.constructor();

		handler.reset();
	} );

	it( "should dispatch actions to store action listeners", function() {
		dispatcher.registerStore( {
			namespace: "alpha",
			actions: [
				{ actionType: "test", waitFor: [] }
			]
		} );

		var subscription = dispatcherChannel.subscribe( "alpha.handle.test", handler );

		dispatcher.handleActionDispatch( {
			actionType: testAction
		} );

		subscription.unsubscribe();

		handler.calledOnce.should.be.true;
		handler.lastCall.args[ 0 ].actionType.should.equal( testAction );
		handler.lastCall.args[ 1 ].channel.should.equal( "lux.dispatcher" ); // test that this is an envelope
	} );

	it( "should dispatch actions to dependent stores in the correct order", function() {
		dispatcher.registerStore( {
			namespace: "alpha",
			actions: [
				{ actionType: "test", waitFor: [ "beta" ] }
			]
		} );

		dispatcher.registerStore( {
			namespace: "beta",
			actions: [
				{ actionType: "test", waitFor: [] }
			]
		} );

		var alphaSubscription = dispatcherChannel.subscribe( "alpha.handle.test", handler );
		var betaSubscription = dispatcherChannel.subscribe( "beta.handle.test", handler );

		dispatcher.handleActionDispatch( {
			actionType: testAction
		} );

		alphaSubscription.unsubscribe();
		betaSubscription.unsubscribe();

		handler.callCount.should.equal( 2 );
		handler.firstCall.args[ 1 ].topic.should.equal( "beta.handle.test" );
		handler.secondCall.args[ 1 ].topic.should.equal( "alpha.handle.test" );
	} );

	it( "should properly handle when new stores are registered", function() {
		dispatcher.registerStore( {
			namespace: "alpha",
			actions: [
				{ actionType: "test", waitFor: [] }
			]
		} );

		var alphaSubscription = dispatcherChannel.subscribe( "alpha.handle.test", handler );

		dispatcher.handleActionDispatch( {
			actionType: testAction
		} );

		// register a new store after actions have already been dispatched
		dispatcher.registerStore( {
			namespace: "beta",
			actions: [
				{ actionType: "test", waitFor: [ "alpha" ] }
			]
		} );

		var betaSubscription = dispatcherChannel.subscribe( "beta.handle.test", handler );

		dispatcher.handleActionDispatch( {
			actionType: testAction
		} );

		alphaSubscription.unsubscribe();
		betaSubscription.unsubscribe();

		handler.callCount.should.equal( 3 );
		handler.firstCall.args[ 1 ].topic.should.equal( "alpha.handle.test" );
		handler.secondCall.args[ 1 ].topic.should.equal( "alpha.handle.test" );
		handler.lastCall.args[ 1 ].topic.should.equal( "beta.handle.test" );
	} );

	it( "should properly handle when a store is removed", function() {
		dispatcher.registerStore( {
			namespace: "alpha",
			actions: [
				{ actionType: "test", waitFor: [ "beta" ] }
			]
		} );

		dispatcher.registerStore( {
			namespace: "beta",
			actions: [
				{ actionType: "test", waitFor: [] }
			]
		} );

		var alphaSubscription = dispatcherChannel.subscribe( "alpha.handle.test", handler );
		var betaSubscription = dispatcherChannel.subscribe( "beta.handle.test", handler );

		dispatcher.removeStore( "alpha", true );

		dispatcher.handleActionDispatch( {
			actionType: testAction
		} );

		alphaSubscription.unsubscribe();
		betaSubscription.unsubscribe();

		handler.callCount.should.equal( 1 );
		handler.firstCall.args[ 1 ].topic.should.equal( "beta.handle.test" );
	} );

	it( "should properly finish an action cycle by publishing a notify message", function() {
		dispatcher.registerStore( {
			namespace: "alpha",
			actions: [
				{ actionType: "test", waitFor: [] }
			]
		} );

		var subscription = dispatcherChannel.subscribe( "notify", handler );

		dispatcher.handleActionDispatch( {
			actionType: testAction
		} );

		subscription.unsubscribe();

		handler.calledOnce.should.be.true;
		handler.lastCall.args[ 0 ].action.actionType.should.equal( testAction );
		handler.lastCall.args[ 1 ].channel.should.equal( "lux.dispatcher" ); // test that this is an envelope
	} );

	it( "should properly finish a failed action cycle by publishing a failure and a notify message", function() {
		var notifyHandler = sinon.spy();

		dispatcher.registerStore( {
			namespace: "alpha",
			actions: [
				{ actionType: "test", waitFor: -1 }
			]
		} );

		var subscription = dispatcherChannel.subscribe( "action.failure", handler );
		var notifySubscription = dispatcherChannel.subscribe( "notify", notifyHandler );

		dispatcher.handleActionDispatch( {
			actionType: testAction
		} );

		subscription.unsubscribe();
		notifySubscription.unsubscribe();

		handler.calledOnce.should.be.true;
		handler.lastCall.args[ 0 ].action.actionType.should.equal( testAction );
		handler.lastCall.args[ 1 ].channel.should.equal( "lux.dispatcher" ); // test that this is an envelope
		handler.lastCall.args[ 0 ].should.have.property( "err" );

		notifyHandler.calledOnce.should.be.true;
		notifyHandler.lastCall.args[ 0 ].action.actionType.should.equal( testAction );
		notifyHandler.lastCall.args[ 1 ].channel.should.equal( "lux.dispatcher" ); // test that this is an envelope
	} );
} );
