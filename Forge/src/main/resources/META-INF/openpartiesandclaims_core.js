var Opcodes=Java.type('org.objectweb.asm.Opcodes')
var InsnList=Java.type('org.objectweb.asm.tree.InsnList')
var VarInsnNode=Java.type('org.objectweb.asm.tree.VarInsnNode')
var MethodInsnNode=Java.type('org.objectweb.asm.tree.MethodInsnNode')
var MethodNode=Java.type('org.objectweb.asm.tree.MethodNode')
var InsnNode=Java.type('org.objectweb.asm.tree.InsnNode')
var FieldInsnNode=Java.type('org.objectweb.asm.tree.FieldInsnNode')
var LabelNode=Java.type('org.objectweb.asm.tree.LabelNode')
var LocalVariableNode=Java.type('org.objectweb.asm.tree.LocalVariableNode')
var Label=Java.type('org.objectweb.asm.Label')
var JumpInsnNode=Java.type('org.objectweb.asm.tree.JumpInsnNode')
var FieldNode=Java.type('org.objectweb.asm.tree.FieldNode')

function addCustomGetter(classNode, fieldName, fieldDesc, methodName){
	var methods = classNode.methods
	var getterNode = new MethodNode(Opcodes.ACC_PUBLIC, methodName, "()" + fieldDesc, null, null)
	var labelNode1 = new LabelNode()
	var labelNode2 = new LabelNode()
	var instructions = getterNode.instructions
	instructions.add(labelNode1)
	instructions.add(new VarInsnNode(Opcodes.ALOAD, 0))
	instructions.add(new FieldInsnNode(Opcodes.GETFIELD, classNode.name, fieldName, fieldDesc))
	instructions.add(new InsnNode(Opcodes.ARETURN))
	instructions.add(labelNode2)
	getterNode.localVariables.add(new LocalVariableNode("this", "L" + classNode.name + ";", null, labelNode1, labelNode2, 0))
	getterNode.maxStack = 1
	getterNode.maxLocals = 1
	methods.add(getterNode)
}

function addGetter(classNode, fieldName, fieldDesc){
	addCustomGetter(classNode, fieldName, fieldDesc, "get" + (fieldName.charAt(0) + "").toUpperCase() + fieldName.substring(1))
}

function addSetter(classNode, fieldName, fieldDesc){
	var methods = classNode.methods
	var setterNode = new MethodNode(Opcodes.ACC_PUBLIC, "set" + (fieldName.charAt(0) + "").toUpperCase() + fieldName.substring(1), "(" + fieldDesc +  ")V", null, null)
	var labelNode1 = new LabelNode()
	var labelNode2 = new LabelNode()
	var instructions = setterNode.instructions
	instructions.add(labelNode1)
	instructions.add(new VarInsnNode(Opcodes.ALOAD, 0))
	instructions.add(new VarInsnNode(Opcodes.ALOAD, 1))
	instructions.add(new FieldInsnNode(Opcodes.PUTFIELD, classNode.name, fieldName, fieldDesc))
	instructions.add(new InsnNode(Opcodes.RETURN))
	instructions.add(labelNode2)
	setterNode.localVariables.add(new LocalVariableNode("this", "L" + classNode.name + ";", null, labelNode1, labelNode2, 0))
	setterNode.localVariables.add(new LocalVariableNode("value", fieldDesc, null, labelNode1, labelNode2, 1))
	setterNode.maxStack = 2
	setterNode.maxLocals = 2
	methods.add(setterNode)
}

function clientPacketRedirectTransformCustom(methodNode, methodInsnNode, localVariable){
	var instructions = methodNode.instructions
	var patchList = new InsnList()
	patchList.add(new VarInsnNode(Opcodes.ALOAD, localVariable))
	patchList.add(methodInsnNode)
	for(var i = 0; i < instructions.size(); i++) {
		var insn = instructions.get(i);
		if(insn.getOpcode() == Opcodes.INVOKESTATIC) {
			if(insn.owner.equals("net/minecraft/network/protocol/PacketUtils") && (insn.name.equals("ensureRunningOnSameThread") || insn.name.equals("m_131363_"))) {
				instructions.insert(insn, patchList);
				break;
			}
		}
	}
}

function clientPacketRedirectTransform(methodNode, methodInsnNode){
	clientPacketRedirectTransformCustom(methodNode, methodInsnNode, 1)
}

function initializeCoreMod() {
	return {
		'xaero_pac_minecraftserverclass': {
			'target' : {
				'type' : 'CLASS',
				'name' : 'net.minecraft.server.MinecraftServer'
			},
			'transformer' : function(classNode){
				var fields = classNode.fields
				classNode.interfaces.add("xaero/pac/common/server/IOpenPACMinecraftServer")
				fields.add(new FieldNode(Opcodes.ACC_PRIVATE, "xaero_OPAC_ServerData", "Lxaero/pac/common/server/IServerDataAPI;", null, null))
				addGetter(classNode, "xaero_OPAC_ServerData", "Lxaero/pac/common/server/IServerDataAPI;")
				addSetter(classNode, "xaero_OPAC_ServerData", "Lxaero/pac/common/server/IServerDataAPI;")
				
				return classNode
			}
		},
		'xaero_pac_serverplayerclass': {
			'target' : {
				'type' : 'CLASS',
				'name' : 'net.minecraft.server.level.ServerPlayer'
			},
			'transformer' : function(classNode){
				var fields = classNode.fields
				classNode.interfaces.add("xaero/pac/common/server/player/data/IOpenPACServerPlayer")
				fields.add(new FieldNode(Opcodes.ACC_PRIVATE, "xaero_OPAC_PlayerData", "Lxaero/pac/common/server/player/data/api/ServerPlayerDataAPI;", null, null))
				addGetter(classNode, "xaero_OPAC_PlayerData", "Lxaero/pac/common/server/player/data/api/ServerPlayerDataAPI;")
				addSetter(classNode, "xaero_OPAC_PlayerData", "Lxaero/pac/common/server/player/data/api/ServerPlayerDataAPI;")
				
				return classNode
			}
		},
		'xaero_pac_integratedserver_tickpaused': {
			'target' : {
                'type': 'METHOD',
                'class': 'net.minecraft.client.server.IntegratedServer',
                'methodName': 'm_174968_',
                'methodDesc' : '()V'
			},
			'transformer' : function(methodNode){
				var instructions = methodNode.instructions
				var patchList = new InsnList()
				patchList.add(new VarInsnNode(Opcodes.ALOAD, 0))
				patchList.add(new MethodInsnNode(Opcodes.INVOKESTATIC, 'xaero/pac/common/server/core/ServerCore', 
						"onServerTickStart", "(Lnet/minecraft/server/MinecraftServer;)V"))
				instructions.insert(instructions.get(0), patchList)
				return methodNode
			}
		},
		'xaero_pac_abstractclientplayerentity_getlocationcape': {
			'target' : {
                'type': 'METHOD',
                'class': 'net.minecraft.client.player.AbstractClientPlayer',
                'methodName': 'm_108561_',
                'methodDesc' : '()Lnet/minecraft/resources/ResourceLocation;'
			},
			'transformer' : function(methodNode){
				var MY_LABEL = new LabelNode(new Label())
				methodNode.maxStack += 1
				var insnToInsert = new InsnList()
				insnToInsert.add(new VarInsnNode(Opcodes.ALOAD, 0))
				insnToInsert.add(new MethodInsnNode(Opcodes.INVOKESTATIC, "xaero/pac/client/core/ClientCore", "getPlayerCape", "(Lnet/minecraft/client/player/AbstractClientPlayer;)Lnet/minecraft/resources/ResourceLocation;"))
				insnToInsert.add(new InsnNode(Opcodes.DUP))
				insnToInsert.add(new JumpInsnNode(Opcodes.IFNULL, MY_LABEL))
				insnToInsert.add(new InsnNode(Opcodes.ARETURN))
				insnToInsert.add(MY_LABEL)
				insnToInsert.add(new InsnNode(Opcodes.POP))
				methodNode.instructions.insert(methodNode.instructions.get(0), insnToInsert)
				return methodNode
			}
		},
		'xaero_pac_playerentity_iswearing': {
			'target' : {
                'type': 'METHOD',
                'class': 'net.minecraft.world.entity.player.Player',
                'methodName': 'm_36170_',
                'methodDesc' : '(Lnet/minecraft/world/entity/player/PlayerModelPart;)Z'
			},
			'transformer' : function(methodNode){
				var MY_LABEL = new LabelNode(new Label())
				var insnToInsert = new InsnList()
				insnToInsert.add(new VarInsnNode(Opcodes.ALOAD, 0))
				insnToInsert.add(new VarInsnNode(Opcodes.ALOAD, 1))
				insnToInsert.add(new MethodInsnNode(Opcodes.INVOKESTATIC, "xaero/pac/client/core/ClientCore", "isWearing", "(Lnet/minecraft/world/entity/player/Player;Lnet/minecraft/world/entity/player/PlayerModelPart;)Ljava/lang/Boolean;"))
				insnToInsert.add(new InsnNode(Opcodes.DUP))
				insnToInsert.add(new JumpInsnNode(Opcodes.IFNULL, MY_LABEL))
				insnToInsert.add(new MethodInsnNode(Opcodes.INVOKEVIRTUAL, "java/lang/Boolean", "booleanValue", "()Z"))
				insnToInsert.add(new InsnNode(Opcodes.IRETURN))
				insnToInsert.add(MY_LABEL)
				insnToInsert.add(new InsnNode(Opcodes.POP))
				methodNode.instructions.insert(methodNode.instructions.get(0), insnToInsert)
				return methodNode
			}
		},
        'xaero_pac_clientplaynethandler_handleinitializeborder': {
            'target' : {
                 'type': 'METHOD',
                 'class': 'net.minecraft.client.multiplayer.ClientPacketListener',
                 'methodName': 'm_142237_',
                 'methodDesc' : '(Lnet/minecraft/network/protocol/game/ClientboundInitializeBorderPacket;)V'
            },
            'transformer' : function(methodNode){
                clientPacketRedirectTransform(methodNode, new MethodInsnNode(Opcodes.INVOKESTATIC, 'xaero/pac/client/core/ClientCore',
                        "onInitializeWorldBorder", "(Lnet/minecraft/network/protocol/game/ClientboundInitializeBorderPacket;)V"))
                return methodNode
            }
        },
        'xaero_pac_playerlist_sendworldinfo': {
            'target' : {
                 'type': 'METHOD',
                 'class': 'net.minecraft.server.players.PlayerList',
                 'methodName': 'm_11229_',
                 'methodDesc' : '(Lnet/minecraft/server/level/ServerPlayer;Lnet/minecraft/server/level/ServerLevel;)V'
            },
            'transformer' : function(methodNode){
                var instructions = methodNode.instructions
                var patchList = new InsnList()
                patchList.add(new VarInsnNode(Opcodes.ALOAD, 1))
                patchList.add(new MethodInsnNode(Opcodes.INVOKESTATIC, 'xaero/pac/common/server/core/ServerCore',
                        "onServerWorldInfo", "(Lnet/minecraft/world/entity/player/Player;)V"))
                instructions.insert(instructions.get(0), patchList)
                return methodNode
            }
        },
        'xaero_pac_livingentity_addeffect': {
            'target' : {
                 'type': 'METHOD',
                 'class': 'net.minecraft.world.entity.LivingEntity',
                 'methodName': 'm_147207_',
                 'methodDesc' : '(Lnet/minecraft/world/effect/MobEffectInstance;Lnet/minecraft/world/entity/Entity;)Z'
            },
            'transformer' : function(methodNode){
				var MY_LABEL = new LabelNode(new Label())
				var insnToInsert = new InsnList()
				insnToInsert.add(new VarInsnNode(Opcodes.ALOAD, 0))
				insnToInsert.add(new VarInsnNode(Opcodes.ALOAD, 1))
				insnToInsert.add(new VarInsnNode(Opcodes.ALOAD, 2))
				insnToInsert.add(new MethodInsnNode(Opcodes.INVOKESTATIC, 'xaero/pac/common/server/core/ServerCore', "canAddLivingEntityEffect", "(Lnet/minecraft/world/entity/LivingEntity;Lnet/minecraft/world/effect/MobEffectInstance;Lnet/minecraft/world/entity/Entity;)Z"))
				insnToInsert.add(new InsnNode(Opcodes.DUP))
				insnToInsert.add(new JumpInsnNode(Opcodes.IFNE, MY_LABEL))
				insnToInsert.add(new InsnNode(Opcodes.IRETURN))
				insnToInsert.add(MY_LABEL)
				insnToInsert.add(new InsnNode(Opcodes.POP))
				methodNode.instructions.insert(methodNode.instructions.get(0), insnToInsert)
                return methodNode
            }
        }
	}
}