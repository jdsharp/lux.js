define( [
	"lux",
	"lodash",
	"laneParser"
], function( lux, _, parser) {

		function toggleAncestors( lookup, target ) {
			var parentId = target.parentLaneId;
			var parent = lookup[ parentId ];
			var index;
			if ( parent ) {
				index = parent.activeChildren.indexOf( target.id );
				if ( target.isActive && index === -1 ) {
					parent.activeChildren.push( target.id );
				} else if ( !target.isActive && index !== -1 ) {
					parent.activeChildren.splice( index, 1 );
				}
				if ( parent.activeChildren.length > 0 && !parent.isActive ) {
					parent.isActive = true;
				} else if ( parent.activeChildren.length === 0 && parent.isActive ) {
					parent.isActive = false;
				}
				toggleAncestors( lookup, parent );
			}
		}

		function toggleDescendants( target ) {
			var isActive = target.isActive;
			_.each( target.items, function( item ) {
				var index = target.activeChildren.indexOf( item.id );
				if ( item.isActive !== isActive ) {
					if ( item.isActive && !isActive && index !== -1 ) {
						target.activeChildren.splice( index, 1 );
					} else if ( !item.isActive && isActive && index === -1 ) {
						target.activeChildren.push( item.id );
					}
					item.isActive = isActive;
					toggleDescendants( item );
				}
			} );
		}

		var boardStore = new lux.Store( {
			namespace: "board",
			handlers: {
				toggleLaneSelection: function( boardId, laneId ) {
					var newState = this.getState();
					var target = newState[ boardId ] && newState[ boardId ].lookup[ laneId ];
					if ( target ) {
						target.isActive = !target.isActive;
						toggleAncestors( newState[ boardId ].lookup, target );
						toggleDescendants( target );
						this.setState(newState);
					}
				},
				boardLoaded: function( boardId, board ) {
					var newState = this.getState();
					newState[ boardId ] = parser.transform( board );
					newState._currentBoardId = boardId;
					this.setState(newState);
				}
			},
			getCurrentBoard: function() {
				var state = this.getState();
				return state[state._currentBoardId];
			},
			getBoard: function(id) {
				return this.getState()[id];
			}
		} );

		return boardStore;
	} );
